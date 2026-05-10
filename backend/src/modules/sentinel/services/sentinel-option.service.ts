import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { SseService } from './sse.service';
import type { SentinelOption, DividendHistory } from '@/generated/prisma/client';
import type {
  OpLabOptionFlat,
  OpLabHistoricalEntry,
} from '../schemas/sentinel.schema';

const OPLAB_BASE_URL = 'https://api.oplab.com.br/v3';
const UNAVAILABLE_RETRY_DAYS = 30;

@Injectable()
export class SentinelOptionService {
  private readonly logger = new Logger(SentinelOptionService.name);
  private readonly accessToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sseService: SseService,
  ) {
    this.accessToken = process.env.OPLAB_ACCESS_TOKEN ?? '';
  }

  /**
   * Ponto de entrada disparado quando uma carteira é aberta.
   * Chamado sem await em getDashboard() — não bloqueia a resposta HTTP.
   * Busca todos os tickers STOCK da carteira, verifica cada sentinela em paralelo,
   * propaga dividendos novos e notifica o frontend via SSE.
   * Qualquer exceção aqui é capturada internamente — nunca afeta o usuário.
   */
  async checkWalletSentinels(walletId: string): Promise<void> {
    process.stdout.write(`[SENTINEL-SVC] checkWalletSentinels iniciado walletId=${walletId}\n`);
    try {
      // Inclui underlyingAsset das opções para poder verificar dividendos mesmo em
      // carteiras que têm opções mas não possuem a ação subjacente diretamente.
      const positions = await this.prisma.position.findMany({
        where: { walletId },
        select: {
          assetId: true,
          asset: {
            select: {
              ticker: true,
              type: true,
              optionDetail: {
                select: { underlyingAsset: { select: { ticker: true } } },
              },
            },
          },
        },
        distinct: ['assetId'],
      });

      const stockSymbols = [
        ...new Set(
          positions
            .filter((p) => p.asset.type === 'STOCK')
            .map((p) => p.asset.ticker),
        ),
      ];

      // Tickers subjacentes de opções na carteira (ex: PETRD325 → PETR4).
      // Necessário para detectar dividendos em carteiras sem a ação diretamente.
      const optionUnderlyingSymbols = [
        ...new Set(
          positions
            .filter((p) => p.asset.type === 'OPTION')
            .map((p) => p.asset.optionDetail?.underlyingAsset?.ticker)
            .filter((t): t is string => Boolean(t)),
        ),
      ];

      const allMonitoredSymbols = [...new Set([...stockSymbols, ...optionUnderlyingSymbols])];

      this.logger.log(
        `[SENTINEL] walletId=${walletId} posições=${positions.length} STOCK=${stockSymbols.join(',')} OPT_UNDERLYING=${optionUnderlyingSymbols.join(',')}`,
      );

      if (allMonitoredSymbols.length === 0) {
        this.sseService.emit(walletId, { type: 'check_complete' });
        return;
      }

      let newDividendsDetected = false;

      // Verifica sentinelas apenas para ações presentes na carteira.
      // Carteiras apenas com opções pulam este bloco mas ainda reconciliam strikes abaixo.
      if (stockSymbols.length > 0) {
        const results = await Promise.allSettled(
          stockSymbols.map((symbol) => this.checkSentinel(symbol, walletId)),
        );

        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            this.logger.error(
              `[SENTINEL] checkSentinel(${stockSymbols[i]}) rejeitou: ${(r.reason as Error).message}`,
            );
          }
        });

        newDividendsDetected = results.some(
          (r) => r.status === 'fulfilled' && (r.value as DividendHistory[]).length > 0,
        );
      }

      // Sempre propaga dividendos e reconcilia strikes — inclusive para carteiras
      // que têm apenas opções (sem a ação subjacente diretamente).
      await this.propagateDividendsToWallet(walletId);

      // Emite dividends_updated se há dividendos para qualquer ativo monitorado
      // (ações ou subjacentes de opções). Garante que o frontend recarrega os dados.
      const hasDividendHistory = await this.prisma.dividendHistory.count({
        where: { underlyingSymbol: { in: allMonitoredSymbols } },
      });

      if (newDividendsDetected || hasDividendHistory > 0) {
        this.logger.log(`[SENTINEL] Proventos aplicados para carteira ${walletId}`);
        this.sseService.emit(walletId, { type: 'dividends_updated' });
      } else {
        this.sseService.emit(walletId, { type: 'check_complete' });
      }
    } catch (error) {
      this.logger.error(
        `Erro em checkWalletSentinels(${walletId}): ${(error as Error).message}`,
      );
      this.sseService.emit(walletId, { type: 'check_complete' });
    }
  }

  /**
   * Ponto de entrada principal da verificação da sentinela.
   * Recebe o ticker do ativo-base (ex: "PETR4"), busca a sentinela no banco
   * e direciona para o branch correto (1 a 5) conforme o estado atual.
   * Retorna a lista de novos eventos de dividendo detectados nesta verificação.
   * Se nada mudou ou a verificação foi pulada, retorna array vazio.
   */
  async checkSentinel(underlyingSymbol: string, walletId: string): Promise<DividendHistory[]> {
    const symbol = underlyingSymbol.toUpperCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sentinel = await this.prisma.sentinelOption.findUnique({
      where: { underlyingSymbol: symbol },
    });

    // BRANCH 4: sentinela não existe ainda — criar
    if (!sentinel) {
      await this.createSentinel(symbol, today);
      return [];
    }

    const lastChecked = new Date(sentinel.lastCheckedAt);
    lastChecked.setHours(0, 0, 0, 0);
    const alreadyCheckedToday = lastChecked.getTime() === today.getTime();

    // BRANCH 1: já verificou hoje — pular
    if (sentinel.status === 'ACTIVE' && alreadyCheckedToday) {
      return [];
    }

    // BRANCH 5: sentinela UNAVAILABLE
    if (sentinel.status === 'UNAVAILABLE') {
      const daysSinceCheck = Math.floor(
        (today.getTime() - lastChecked.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceCheck < UNAVAILABLE_RETRY_DAYS) {
        return [];
      }
      await this.retryUnavailable(sentinel, today);
      return [];
    }

    // BRANCH 3: opção venceu — rolar para nova sentinela
    if (sentinel.dueDate && sentinel.dueDate < today) {
      return this.rollSentinel(sentinel, today, walletId);
    }

    // BRANCH 2: verificação normal do dia
    return this.checkForStrikeChanges(sentinel, today, undefined, walletId);
  }

  /**
   * Cria uma nova sentinela para um ativo que ainda não possui monitoramento.
   * Chama GET /v3/market/options/{symbol} na OpLab, filtra opções com bid > 0,
   * ordena por due_date decrescente e registra a de maior vencimento.
   * Se nenhuma opção com liquidez for encontrada, registra com status UNAVAILABLE
   * para que o sistema tente novamente após 30 dias.
   */
  private async createSentinel(
    underlyingSymbol: string,
    today: Date,
  ): Promise<void> {
    const todayStr = today.toISOString().split('T')[0];

    try {
      const options = await this.fetchOptions(underlyingSymbol);
      const valid = options
        .filter((o) => o.due_date > todayStr && o.bid > 0)
        .sort((a, b) => b.due_date.localeCompare(a.due_date));

      if (valid.length === 0) {
        // Nenhuma opção disponível — registrar como UNAVAILABLE
        await this.prisma.sentinelOption.create({
          data: {
            underlyingSymbol,
            status: 'UNAVAILABLE',
            monitoringSince: today,
            lastCheckedAt: today,
          },
        });
        this.logger.warn(
          `Sentinel UNAVAILABLE para ${underlyingSymbol}: nenhuma opção com bid > 0`,
        );
        return;
      }

      const best = valid[0];
      await this.prisma.sentinelOption.create({
        data: {
          underlyingSymbol,
          optionSymbol: best.symbol,
          status: 'ACTIVE',
          initialStrike: new Decimal(best.strike_eod),
          currentStrike: new Decimal(best.strike_eod),
          dueDate: new Date(best.due_date),
          monitoringSince: today,
          lastCheckedAt: today,
        },
      });
      this.logger.log(
        `Sentinel criada para ${underlyingSymbol}: ${best.symbol} vence ${best.due_date}`,
      );
    } catch (error) {
      const err = error as { code?: string };
      if (err.code === 'P2002') {
        // Race condition: chamada concorrente já criou a sentinela — idempotente
        return;
      }
      this.logger.error(
        `Erro ao criar sentinel para ${underlyingSymbol}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Verifica se houve mudanças de strike desde a última checagem.
   * Chama GET /v3/market/historical/options/{spot}/{last_checked}/{hoje}?symbol={sentinela}.
   * Percorre o array retornado comparando o strike de cada dia com o anterior:
   * cada queda indica um dividendo pago naquela data.
   * Insere os eventos em dividends_history e atualiza current_strike e last_checked_at.
   */
  private async checkForStrikeChanges(
    sentinel: SentinelOption,
    today: Date,
    toDate?: Date,
    walletId?: string,
  ): Promise<DividendHistory[]> {
    const from = sentinel.lastCheckedAt.toISOString().split('T')[0];
    const to = (toDate ?? today).toISOString().split('T')[0];
    const newEvents: DividendHistory[] = [];

    try {
      const history = await this.fetchHistory(
        sentinel.underlyingSymbol,
        from,
        to,
        sentinel.optionSymbol!,
      );

      if (history.length === 0) {
        // Histórico vazio = sem alterações = sem dividendos no período
        await this.prisma.sentinelOption.update({
          where: { id: sentinel.id },
          data: { lastCheckedAt: today },
        });
        return [];
      }

      // Ordena por data para garantir comparação cronológica
      history.sort((a, b) => a.time.localeCompare(b.time));

      // Referência inicial: currentStrike do banco (baseline)
      let referenceStrike = Number(sentinel.currentStrike);

      for (const entry of history) {
        const entryStrike = entry.strike;
        const diff = referenceStrike - entryStrike;

        if (diff > 0.001) {
          // Queda de strike detectada — registrar como dividendo
          const detectedAt = new Date(entry.time);
          detectedAt.setHours(0, 0, 0, 0);

          try {
            const event = await this.prisma.dividendHistory.create({
              data: {
                underlyingSymbol: sentinel.underlyingSymbol,
                sentinelOptionId: sentinel.id,
                detectedAt,
                previousStrike: new Decimal(referenceStrike),
                newStrike: new Decimal(entryStrike),
                dividendAmount: new Decimal(diff),
              },
            });
            newEvents.push(event);
            if (walletId) {
              await this.propagateStrikeAdjustments(walletId, sentinel.underlyingSymbol, new Decimal(diff));
            }
            this.logger.log(
              `Dividendo detectado: ${sentinel.underlyingSymbol} R$${diff.toFixed(4)} em ${detectedAt.toISOString().split('T')[0]}`,
            );
          } catch (e: unknown) {
            // Violação de UNIQUE = evento já registrado (idempotente) — ignorar
            const err = e as { code?: string };
            if (err.code !== 'P2002') throw e;
          }

          referenceStrike = entryStrike;
        } else {
          referenceStrike = entryStrike;
        }
      }

      // Atualiza o strike atual e a data de última checagem
      await this.prisma.sentinelOption.update({
        where: { id: sentinel.id },
        data: {
          currentStrike: new Decimal(referenceStrike),
          lastCheckedAt: today,
        },
      });
    } catch (error) {
      // Falha na OpLab não bloqueia a carteira — last_checked_at não é atualizado,
      // então na próxima abertura o sistema tentará novamente com o mesmo range
      this.logger.error(
        `Erro ao verificar strikes de ${sentinel.underlyingSymbol}: ${(error as Error).message}`,
      );
    }

    return newEvents;
  }

  /**
   * Executado quando a opção sentinela atingiu seu vencimento (due_date < hoje).
   * Primeiro processa os dividendos pendentes entre last_checked_at e due_date.
   * Em seguida, busca uma nova opção de maior vencimento com bid > 0 e atualiza
   * a sentinela com os novos dados — sem deletar o registro, preservando
   * o monitoring_since e todo o histórico de dividends_history vinculado.
   */
  private async rollSentinel(
    sentinel: SentinelOption,
    today: Date,
    walletId?: string,
  ): Promise<DividendHistory[]> {
    // Processa dividendos pendentes até o vencimento da opção atual
    const pendingEvents = await this.checkForStrikeChanges(
      sentinel,
      today,
      sentinel.dueDate!,
      walletId,
    );

    const todayStr = today.toISOString().split('T')[0];

    try {
      const options = await this.fetchOptions(sentinel.underlyingSymbol);
      const valid = options
        .filter((o) => o.due_date > todayStr && o.bid > 0)
        .sort((a, b) => b.due_date.localeCompare(a.due_date));

      if (valid.length === 0) {
        // Sem nova opção disponível — marcar como UNAVAILABLE temporariamente
        await this.prisma.sentinelOption.update({
          where: { id: sentinel.id },
          data: {
            status: 'UNAVAILABLE',
            optionSymbol: null,
            currentStrike: null,
            dueDate: null,
            lastCheckedAt: today,
          },
        });
        this.logger.warn(
          `Sentinel de ${sentinel.underlyingSymbol} venceu sem substituto disponível`,
        );
        return pendingEvents;
      }

      const best = valid[0];
      // Atualiza a sentinela existente com a nova opção (não deleta — preserva histórico)
      await this.prisma.sentinelOption.update({
        where: { id: sentinel.id },
        data: {
          optionSymbol: best.symbol,
          status: 'ACTIVE',
          initialStrike: new Decimal(best.strike_eod),
          currentStrike: new Decimal(best.strike_eod),
          dueDate: new Date(best.due_date),
          lastCheckedAt: today,
        },
      });
      this.logger.log(
        `Sentinel de ${sentinel.underlyingSymbol} rolada para ${best.symbol} (vence ${best.due_date})`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao rolar sentinel de ${sentinel.underlyingSymbol}: ${(error as Error).message}`,
      );
    }

    return pendingEvents;
  }

  /**
   * Tenta reativar uma sentinela que estava UNAVAILABLE por falta de opções.
   * Só executa se last_checked_at for há mais de 30 dias (evita tentativas desnecessárias).
   * Se encontrar nova opção com bid > 0, atualiza para ACTIVE.
   * Se não encontrar, apenas atualiza last_checked_at para tentar novamente em 30 dias.
   */
  private async retryUnavailable(
    sentinel: SentinelOption,
    today: Date,
  ): Promise<void> {
    const todayStr = today.toISOString().split('T')[0];

    try {
      const options = await this.fetchOptions(sentinel.underlyingSymbol);
      const valid = options
        .filter((o) => o.due_date > todayStr && o.bid > 0)
        .sort((a, b) => b.due_date.localeCompare(a.due_date));

      if (valid.length === 0) {
        // Ainda sem opções — atualiza o timestamp para tentar novamente em 30 dias
        await this.prisma.sentinelOption.update({
          where: { id: sentinel.id },
          data: { lastCheckedAt: today },
        });
        return;
      }

      const best = valid[0];
      await this.prisma.sentinelOption.update({
        where: { id: sentinel.id },
        data: {
          optionSymbol: best.symbol,
          status: 'ACTIVE',
          initialStrike: new Decimal(best.strike_eod),
          currentStrike: new Decimal(best.strike_eod),
          dueDate: new Date(best.due_date),
          lastCheckedAt: today,
        },
      });
      this.logger.log(
        `Sentinel de ${sentinel.underlyingSymbol} reativada: ${best.symbol}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao reativar sentinel de ${sentinel.underlyingSymbol}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Propaga os dividendos detectados para a tabela wallet_dividend_payments de uma carteira.
   * Para cada posição STOCK da carteira, busca eventos em dividends_history
   * cuja data (detected_at) seja posterior à data de compra do ativo naquela carteira
   * E posterior ao monitoring_since da sentinela.
   * Reconstrói a quantidade histórica do ativo em cada data-ex e persiste o pagamento.
   */
  async getWalletSentinelStatus(
    walletId: string,
  ): Promise<{ ticker: string; status: string; monitoringSince: string | null; scanningSince: string | null }[]> {
    const allPositions = await this.prisma.position.findMany({
      where: { walletId },
      include: { asset: true },
      distinct: ['assetId'],
    });
    const stockPositions = allPositions.filter((p) => p.asset.type === 'STOCK');

    const result = await Promise.all(
      stockPositions.map(async (p) => {
        const sentinel = await this.prisma.sentinelOption.findUnique({
          where: { underlyingSymbol: p.asset.ticker },
        });
        return {
          ticker: p.asset.ticker,
          status: sentinel?.status ?? 'NOT_MONITORED',
          monitoringSince: sentinel?.monitoringSince?.toISOString().split('T')[0] ?? null,
          scanningSince: sentinel?.scanningFrom?.toISOString().split('T')[0] ?? null,
        };
      }),
    );

    return result;
  }

  async propagateDividendsToWallet(walletId: string): Promise<void> {
    const allPositions = await this.prisma.position.findMany({
      where: { walletId },
      include: {
        asset: {
          include: {
            optionDetail: {
              include: { underlyingAsset: { select: { ticker: true } } },
            },
          },
        },
      },
    });
    const positions = allPositions.filter((p) => p.asset.type === 'STOCK');

    for (const position of positions) {
      const sentinel = await this.prisma.sentinelOption.findUnique({
        where: { underlyingSymbol: position.asset.ticker },
      });

      // Sem sentinela ativa para este ativo — pula
      if (!sentinel || sentinel.status === 'UNAVAILABLE') continue;

      // Busca a data de primeira compra deste ativo nesta carteira
      const firstBuy = await this.prisma.transaction.findFirst({
        where: { walletId, assetId: position.assetId, type: 'BUY' },
        orderBy: { executedAt: 'asc' },
        select: { executedAt: true },
      });

      if (!firstBuy) continue;

      // Só computa dividendos a partir da data de compra E do início do monitoramento
      const fromDate =
        firstBuy.executedAt > sentinel.monitoringSince
          ? firstBuy.executedAt
          : sentinel.monitoringSince;

      const events = await this.prisma.dividendHistory.findMany({
        where: {
          underlyingSymbol: position.asset.ticker,
          detectedAt: { gte: fromDate },
        },
        orderBy: { detectedAt: 'asc' },
      });

      for (const event of events) {
        // Reconstrói a quantidade que o cliente tinha naquela data
        const quantity = await this.getQuantityAtDate(
          walletId,
          position.assetId,
          event.detectedAt,
        );

        // Quantidade zero ou negativa — dividendo antes da compra nesta carteira
        if (quantity <= 0) continue;

        const totalReceived = new Decimal(quantity).times(event.dividendAmount);

        await this.prisma.walletDividendPayment.upsert({
          where: {
            walletId_ticker_exDividendDate: {
              walletId,
              ticker: position.asset.ticker,
              exDividendDate: event.detectedAt,
            },
          },
          create: {
            walletId,
            positionId: position.id,
            ticker: position.asset.ticker,
            dividendType: 'DIVIDENDO',
            exDividendDate: event.detectedAt,
            valuePerShare: event.dividendAmount,
            quantityAtDate: quantity,
            totalReceived,
          },
          update: {
            quantityAtDate: quantity,
            totalReceived,
          },
        });
      }
    }

    // Reconciliação idempotente de strike para opções — recalcula a partir do initialStrike
    // menos a soma dos dividendos detectados após a compra. Garante que carteiras abertas depois
    // de outra detectar o dividendo também recebam o ajuste de strike.
    // Opções já vencidas (expirationDate < hoje) são ignoradas — o strike delas não tem relevância.
    const reconciliationToday = new Date();
    reconciliationToday.setHours(0, 0, 0, 0);
    const optionPositions = allPositions.filter(
      (p) =>
        p.asset.type === 'OPTION' &&
        p.asset.optionDetail?.initialStrike != null &&
        p.asset.optionDetail.expirationDate >= reconciliationToday,
    );

    for (const pos of optionPositions) {
      const od = pos.asset.optionDetail!;
      if (!od.initialStrike) continue;

      const underlyingTicker = od.underlyingAsset?.ticker;
      if (!underlyingTicker) continue;

      const sentinel = await this.prisma.sentinelOption.findUnique({
        where: { underlyingSymbol: underlyingTicker },
      });
      if (!sentinel || sentinel.status !== 'ACTIVE') continue;

      const firstBuy = await this.prisma.transaction.findFirst({
        where: { walletId, assetId: pos.assetId, type: 'BUY' },
        orderBy: { executedAt: 'asc' },
        select: { executedAt: true },
      });
      if (!firstBuy) continue;

      const fromDate =
        firstBuy.executedAt > sentinel.monitoringSince
          ? firstBuy.executedAt
          : sentinel.monitoringSince;

      const dividends = await this.prisma.dividendHistory.findMany({
        where: {
          underlyingSymbol: underlyingTicker,
          detectedAt: { gte: fromDate },
        },
      });

      if (dividends.length === 0) continue;

      const totalAdjustment = dividends.reduce(
        (sum, d) => sum.plus(new Decimal(d.dividendAmount.toString())),
        new Decimal(0),
      );
      const expectedStrike = new Decimal(od.initialStrike.toString()).minus(totalAdjustment);
      const currentStrike = new Decimal(od.strikePrice.toString());

      if (!expectedStrike.equals(currentStrike)) {
        await this.prisma.optionDetail.update({
          where: { id: od.id },
          data: { strikePrice: expectedStrike },
        });
      }
    }
  }

  /**
   * NEGÓCIO: Quando uma empresa paga proventos, a bolsa reduz automaticamente o preço de exercício
   * (strike) de todas as opções daquele ativo. Este método aplica esse ajuste nas opções ativas
   * de uma carteira específica, para que o strike exibido ao investidor reflita o valor real de mercado.
   * TÉCNICO: Subtrai dividendAmount do strikePrice de todas as opções ativas desta carteira
   * cujo ativo-base é underlyingSymbol e cujo vencimento é >= hoje. Nunca toca initialStrike.
   */
  async propagateStrikeAdjustments(
    walletId: string,
    underlyingSymbol: string,
    dividendAmount: Decimal,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const underlyingAsset = await this.prisma.asset.findUnique({
      where: { ticker: underlyingSymbol },
      select: { id: true },
    });
    if (!underlyingAsset) return;

    const positions = await this.prisma.position.findMany({
      where: { walletId },
      include: {
        asset: {
          include: { optionDetail: true },
        },
      },
    });

    const optionPositions = positions.filter(
      (p) =>
        p.asset.type === 'OPTION' &&
        p.asset.optionDetail?.underlyingAssetId === underlyingAsset.id &&
        p.asset.optionDetail?.expirationDate >= today,
    );

    for (const position of optionPositions) {
      const od = position.asset.optionDetail!;
      await this.prisma.optionDetail.update({
        where: { id: od.id },
        data: {
          strikePrice: new Decimal(od.strikePrice.toString()).minus(dividendAmount),
          // Não atualizar initialStrike — é o valor original da compra, não muda com proventos
        },
      });
    }
  }

  /**
   * Reconstrói a quantidade que o cliente possuía de um ativo em uma data específica,
   * somando todas as compras e subtraindo todas as vendas até aquela data.
   */
  private async getQuantityAtDate(
    walletId: string,
    assetId: string,
    date: Date,
  ): Promise<number> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        walletId,
        assetId,
        type: { in: ['BUY', 'SELL'] },
        executedAt: { lte: date },
      },
      select: { type: true, quantity: true },
    });

    return transactions
      .reduce((sum, tx) => {
        if (!tx.quantity) return sum;
        return tx.type === 'BUY'
          ? sum.plus(tx.quantity.toString())
          : sum.minus(tx.quantity.toString());
      }, new Decimal(0))
      .toNumber();
  }

  /**
   * Faz chamada autenticada ao endpoint de listagem de opções da OpLab.
   * GET /v3/market/options/{symbol} → retorna array flat de todas as opções do ativo.
   */
  private async fetchOptions(symbol: string): Promise<OpLabOptionFlat[]> {
    const url = `${OPLAB_BASE_URL}/market/options/${symbol}`;
    const response = await fetch(url, {
      headers: { 'Access-Token': this.accessToken },
    });
    if (!response.ok) {
      throw new Error(`OpLab /options/${symbol} retornou ${response.status}`);
    }
    return response.json() as Promise<OpLabOptionFlat[]>;
  }

  /**
   * NEGÓCIO: Ao registrar uma compra com data retroativa, verifica se já temos o histórico de proventos
   * cobrindo aquele período. Se não, inicia a varredura em segundo plano sem bloquear o assessor.
   * TÉCNICO: Dispara retroactiveScan em fire-and-forget se a data da compra for anterior à cobertura atual da sentinela.
   */
  async triggerRetroactiveScanIfNeeded(
    ticker: string,
    purchaseDate: Date,
    walletId: string,
  ): Promise<void> {
    const sentinel = await this.prisma.sentinelOption.findUnique({
      where: { underlyingSymbol: ticker },
    });
    if (!sentinel || sentinel.status === 'UNAVAILABLE') return;

    const MIN_DATE = new Date('2020-01-01');
    const effectiveDate = purchaseDate < MIN_DATE ? MIN_DATE : purchaseDate;
    if (effectiveDate >= sentinel.monitoringSince) return;

    this.retroactiveScan(ticker, effectiveDate, walletId).catch((e) =>
      this.logger.error(`[M2] retroactiveScan falhou: ${(e as Error).message}`),
    );
  }

  /**
   * NEGÓCIO: Quando um assessor registra uma compra com data no passado, o sistema precisa "recuperar" todos os
   * proventos pagos entre aquela data e hoje para que o histórico de dividendos da carteira fique completo e correto.
   * TÉCNICO: Orquestra a varredura retroativa dividindo o período em chunks anuais, processando cada um em sequência
   * e, ao final, atualizando a data de cobertura da sentinela e notificando todas as carteiras afetadas via SSE.
   */
  async retroactiveScan(ticker: string, fromDate: Date, walletId: string): Promise<void> {
    const sentinel = await this.prisma.sentinelOption.findUnique({
      where: { underlyingSymbol: ticker },
    });
    if (!sentinel || sentinel.status === 'UNAVAILABLE') return;
    if (sentinel.scanningFrom !== null) return;

    const MIN_DATE = new Date('2020-01-01');
    const effectiveFrom = fromDate < MIN_DATE ? MIN_DATE : fromDate;
    if (effectiveFrom >= sentinel.monitoringSince) return;

    await this.prisma.sentinelOption.update({
      where: { id: sentinel.id },
      data: { scanningFrom: effectiveFrom },
    });

    try {
      const chunks = this.buildAnnualChunks(effectiveFrom, sentinel.monitoringSince);
      for (const chunk of chunks) {
        await this.processRetroactiveChunk(ticker, sentinel.id, chunk.from, chunk.to, walletId);
      }

      await this.prisma.sentinelOption.update({
        where: { id: sentinel.id },
        data: { monitoringSince: effectiveFrom, scanningFrom: null },
      });

      await this.emitDividendsUpdatedForTicker(ticker);
    } catch (error) {
      this.logger.error(`[M2] Erro em retroactiveScan(${ticker}): ${(error as Error).message}`);
      await this.prisma.sentinelOption.update({
        where: { id: sentinel.id },
        data: { scanningFrom: null },
      });
    }
  }

  /**
   * NEGÓCIO: Após a varredura histórica concluir, todos os clientes que possuem aquela ação precisam ver
   * o histórico de proventos atualizado em tempo real, sem precisar recarregar a página.
   * TÉCNICO: Emite o evento SSE 'dividends_updated' para todas as carteiras que possuem posição no ticker.
   */
  private async emitDividendsUpdatedForTicker(ticker: string): Promise<void> {
    const positions = await this.prisma.position.findMany({
      where: { asset: { ticker } },
      select: { walletId: true },
      distinct: ['walletId'],
    });
    for (const { walletId } of positions) {
      this.sseService.emit(walletId, { type: 'dividends_updated' });
    }
  }

  /**
   * NEGÓCIO: Uma varredura histórica de vários anos seria uma única requisição enorme e instável.
   * Dividir por ano garante que cada consulta seja pequena, tolerante a falhas e recomeçável se a OpLab cair.
   * TÉCNICO: Divide o intervalo [from, to] em fatias anuais (01/01–31/12) para limitar cada chamada à OpLab.
   */
  private buildAnnualChunks(from: Date, to: Date): { from: string; to: string }[] {
    const MIN_DATE = new Date('2020-01-01');
    const effectiveFrom = from < MIN_DATE ? MIN_DATE : new Date(from);
    const chunks: { from: string; to: string }[] = [];
    let cursor = new Date(effectiveFrom);

    while (cursor < to) {
      const yearEnd = new Date(cursor.getFullYear(), 11, 31);
      const chunkEnd = yearEnd < to ? yearEnd : new Date(to.getTime() - 86400000);
      chunks.push({
        from: cursor.toISOString().split('T')[0],
        to: chunkEnd.toISOString().split('T')[0],
      });
      cursor = new Date(cursor.getFullYear() + 1, 0, 1);
    }
    return chunks;
  }

  /**
   * NEGÓCIO: Num dado ano, várias séries de opções podem estar ativas sobre a mesma ação. Usamos a série com
   * mais pregões registrados (maior cobertura) para rastrear proventos; se ela vencer no meio do ano,
   * continuamos a análise com a próxima série mais completa disponível naquele período.
   * TÉCNICO: Busca histórico de opções do chunk anual, escolhe a série com mais entradas e detecta dividendos.
   */
  private async processRetroactiveChunk(
    ticker: string,
    sentinelId: string,
    from: string,
    to: string,
    walletId: string,
  ): Promise<void> {
    const history = await this.fetchHistoryAll(ticker, from, to);
    if (history.length === 0) return;

    const grouped = new Map<string, OpLabHistoricalEntry[]>();
    for (const entry of history) {
      const arr = grouped.get(entry.symbol) ?? [];
      arr.push(entry);
      grouped.set(entry.symbol, arr);
    }

    const sorted = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);
    const [bestSymbol, bestEntries] = sorted[0];
    bestEntries.sort((a, b) => a.time.localeCompare(b.time));

    await this.detectDividendsInEntries(ticker, sentinelId, bestEntries, walletId);

    const lastEntryTime = bestEntries[bestEntries.length - 1].time.slice(0, 10);
    if (lastEntryTime < to && sorted.length > 1) {
      const [, nextEntries] = sorted[1];
      const remaining = nextEntries
        .filter((e) => e.time.slice(0, 10) > lastEntryTime)
        .sort((a, b) => a.time.localeCompare(b.time));
      if (remaining.length > 0) {
        await this.detectDividendsInEntries(ticker, sentinelId, remaining, walletId);
      }
    }
  }

  /**
   * NEGÓCIO: Na data ex-dividendo, o strike da opção cai exatamente pelo valor do provento pago pela empresa.
   * Ao comparar o strike de um dia com o do dia anterior, qualquer queda significativa indica um provento.
   * TÉCNICO: Percorre uma sequência de entradas históricas e insere um registro de dividendo para cada queda de strike detectada.
   */
  private async detectDividendsInEntries(
    ticker: string,
    sentinelId: string,
    entries: OpLabHistoricalEntry[],
    walletId: string,
  ): Promise<void> {
    if (entries.length < 2) return;
    let referenceStrike = entries[0].strike;

    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i];
      const diff = referenceStrike - entry.strike;
      if (diff > 0.001) {
        const detectedAt = new Date(entry.time);
        detectedAt.setHours(0, 0, 0, 0);
        try {
          await this.prisma.dividendHistory.create({
            data: {
              underlyingSymbol: ticker,
              sentinelOptionId: sentinelId,
              detectedAt,
              previousStrike: new Decimal(referenceStrike),
              newStrike: new Decimal(entry.strike),
              dividendAmount: new Decimal(diff),
            },
          });
          await this.propagateStrikeAdjustments(walletId, ticker, new Decimal(diff));
        } catch (e) {
          if ((e as { code?: string }).code !== 'P2002') throw e;
        }
      }
      referenceStrike = entry.strike;
    }
  }

  /**
   * NEGÓCIO: Para detectar proventos históricos, precisamos do histórico de preços de todas as opções negociadas
   * sobre uma ação num período, já que qualquer uma delas revelará a queda de strike causada pelo provento.
   * TÉCNICO: Busca o histórico de TODAS as opções do spot no período via OpLab, sem filtrar por symbol.
   */
  private async fetchHistoryAll(
    spot: string,
    from: string,
    to: string,
  ): Promise<OpLabHistoricalEntry[]> {
    const url = `${OPLAB_BASE_URL}/market/historical/options/${spot}/${from}/${to}`;
    const response = await fetch(url, {
      headers: { 'Access-Token': this.accessToken },
    });
    if (!response.ok) {
      throw new Error(`OpLab /historical/${spot} sem symbol retornou ${response.status}`);
    }
    return response.json() as Promise<OpLabHistoricalEntry[]>;
  }

  /**
   * NEGÓCIO: Resolve qual ativo-base monitorar com base no ticker comprado.
   * Para compras de STOCK: monitora o próprio ativo. Para compras de OPTION:
   * monitora o ativo-base da opção (ex: PETRD325 → PETR4).
   * TÉCNICO: Consulta o banco pelo ticker. Se OPTION, retorna o ticker do underlyingAsset.
   */
  async resolveUnderlyingTicker(ticker: string): Promise<string | null> {
    const asset = await this.prisma.asset.findUnique({
      where: { ticker },
      include: {
        optionDetail: { include: { underlyingAsset: { select: { ticker: true } } } },
      },
    });
    if (!asset) return null;
    if (asset.type === 'STOCK') return asset.ticker;
    return asset.optionDetail?.underlyingAsset?.ticker ?? null;
  }

  /**
   * Faz chamada autenticada ao endpoint de histórico da OpLab.
   * GET /v3/market/historical/options/{spot}/{from}/{to}?symbol={optionSymbol}
   * Retorna array de registros diários com o strike de cada dia.
   */
  async fetchHistory(
    spot: string,
    from: string,
    to: string,
    optionSymbol: string,
  ): Promise<OpLabHistoricalEntry[]> {
    const url = `${OPLAB_BASE_URL}/market/historical/options/${spot}/${from}/${to}?symbol=${optionSymbol}`;
    const response = await fetch(url, {
      headers: { 'Access-Token': this.accessToken },
    });
    if (!response.ok) {
      throw new Error(`OpLab /historical/${spot} retornou ${response.status}`);
    }
    return response.json() as Promise<OpLabHistoricalEntry[]>;
  }
}
