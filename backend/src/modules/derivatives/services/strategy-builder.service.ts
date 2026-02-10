import { Injectable, BadRequestException } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { StrategyType, OperationLegType } from '@/generated/prisma/enums';
import type {
  OperationLegInput,
  StrategyRiskProfile,
  StrategyPreviewResponse,
} from '../schemas';

const CONTRACT_SIZE = 100;

interface BuiltStrategy {
  strategyType: StrategyType;
  legs: OperationLegInput[];
  underlyingTicker?: string;
}

@Injectable()
export class StrategyBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build a predefined strategy from parameters
   */
  buildStrategy(
    strategyType: StrategyType,
    params: {
      callTicker?: string;
      putTicker?: string;
      stockTicker?: string;
      callQuantity?: number;
      putQuantity?: number;
      stockQuantity?: number;
      callPremium?: number;
      putPremium?: number;
      stockPrice?: number;
    },
  ): BuiltStrategy {
    const legs: OperationLegInput[] = [];

    switch (strategyType) {
      case StrategyType.STRADDLE:
        if (!params.callTicker || !params.putTicker) {
          throw new BadRequestException(
            'Straddle requer tickers de CALL e PUT',
          );
        }
        legs.push(
          {
            legType: OperationLegType.BUY_CALL,
            ticker: params.callTicker,
            quantity: params.callQuantity ?? 1,
            price: params.callPremium ?? 0,
          },
          {
            legType: OperationLegType.BUY_PUT,
            ticker: params.putTicker,
            quantity: params.putQuantity ?? 1,
            price: params.putPremium ?? 0,
          },
        );
        break;

      case StrategyType.COVERED_CALL:
        if (!params.stockTicker || !params.callTicker) {
          throw new BadRequestException(
            'Covered Call requer ticker da acao e da CALL',
          );
        }
        legs.push(
          {
            legType: OperationLegType.BUY_STOCK,
            ticker: params.stockTicker,
            quantity: (params.callQuantity ?? 1) * CONTRACT_SIZE,
            price: params.stockPrice ?? 0,
          },
          {
            legType: OperationLegType.SELL_CALL,
            ticker: params.callTicker,
            quantity: params.callQuantity ?? 1,
            price: params.callPremium ?? 0,
          },
        );
        break;

      case StrategyType.PROTECTIVE_PUT:
        if (!params.stockTicker || !params.putTicker) {
          throw new BadRequestException(
            'Protective Put requer ticker da acao e da PUT',
          );
        }
        legs.push(
          {
            legType: OperationLegType.BUY_STOCK,
            ticker: params.stockTicker,
            quantity: (params.putQuantity ?? 1) * CONTRACT_SIZE,
            price: params.stockPrice ?? 0,
          },
          {
            legType: OperationLegType.BUY_PUT,
            ticker: params.putTicker,
            quantity: params.putQuantity ?? 1,
            price: params.putPremium ?? 0,
          },
        );
        break;

      case StrategyType.COLLAR:
        if (!params.stockTicker || !params.callTicker || !params.putTicker) {
          throw new BadRequestException(
            'Collar requer ticker da acao, CALL e PUT',
          );
        }
        legs.push(
          {
            legType: OperationLegType.BUY_STOCK,
            ticker: params.stockTicker,
            quantity: (params.callQuantity ?? 1) * CONTRACT_SIZE,
            price: params.stockPrice ?? 0,
          },
          {
            legType: OperationLegType.BUY_PUT,
            ticker: params.putTicker,
            quantity: params.putQuantity ?? 1,
            price: params.putPremium ?? 0,
          },
          {
            legType: OperationLegType.SELL_CALL,
            ticker: params.callTicker,
            quantity: params.callQuantity ?? 1,
            price: params.callPremium ?? 0,
          },
        );
        break;

      case StrategyType.BULL_CALL_SPREAD:
        if (!params.callTicker) {
          throw new BadRequestException(
            'Bull Call Spread requer tickers de CALL',
          );
        }
        throw new BadRequestException(
          'Bull Call Spread requer duas CALLs com strikes diferentes - use estrategia CUSTOM',
        );

      case StrategyType.BEAR_PUT_SPREAD:
        if (!params.putTicker) {
          throw new BadRequestException(
            'Bear Put Spread requer tickers de PUT',
          );
        }
        throw new BadRequestException(
          'Bear Put Spread requer duas PUTs com strikes diferentes - use estrategia CUSTOM',
        );

      case StrategyType.SINGLE_OPTION:
      case StrategyType.CUSTOM:
        throw new BadRequestException(
          `Estrategia ${strategyType} requer definicao manual das pernas`,
        );

      default:
        throw new BadRequestException(
          `Estrategia desconhecida: ${strategyType}`,
        );
    }

    return {
      strategyType,
      legs,
      underlyingTicker: params.stockTicker,
    };
  }

  /**
   * Validate a custom multi-leg strategy
   */
  async validateCustomStrategy(
    legs: OperationLegInput[],
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (legs.length === 0) {
      errors.push('Estrategia deve ter pelo menos uma perna');
    }

    if (legs.length > 4) {
      errors.push('Estrategia pode ter no maximo 4 pernas');
    }

    const tickers = [...new Set(legs.map((l) => l.ticker))];

    for (const ticker of tickers) {
      const asset = await this.prisma.asset.findUnique({
        where: { ticker },
        include: { optionDetail: true },
      });

      if (!asset) {
        errors.push(`Ativo nao encontrado: ${ticker}`);
        continue;
      }

      const legsForTicker = legs.filter((l) => l.ticker === ticker);
      for (const leg of legsForTicker) {
        const isStockLeg =
          leg.legType === OperationLegType.BUY_STOCK ||
          leg.legType === OperationLegType.SELL_STOCK;
        const isOptionLeg = !isStockLeg;

        if (isStockLeg && asset.type !== 'STOCK') {
          errors.push(`${ticker} deve ser uma acao para operacao de stock`);
        }

        if (isOptionLeg && asset.type !== 'OPTION') {
          errors.push(`${ticker} deve ser uma opcao para operacao de opcao`);
        }

        if (isOptionLeg && asset.optionDetail) {
          const isCallLeg =
            leg.legType === OperationLegType.BUY_CALL ||
            leg.legType === OperationLegType.SELL_CALL;
          const isPutLeg =
            leg.legType === OperationLegType.BUY_PUT ||
            leg.legType === OperationLegType.SELL_PUT;

          if (isCallLeg && asset.optionDetail.optionType !== 'CALL') {
            errors.push(`${ticker} e uma PUT, mas foi especificada como CALL`);
          }

          if (isPutLeg && asset.optionDetail.optionType !== 'PUT') {
            errors.push(`${ticker} e uma CALL, mas foi especificada como PUT`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate net premium for a strategy
   * Returns positive for credit, negative for debit
   */
  calculateNetPremium(legs: OperationLegInput[]): number {
    let netPremium = new Decimal(0);

    for (const leg of legs) {
      const legValue = new Decimal(leg.price).times(leg.quantity);

      switch (leg.legType) {
        case OperationLegType.BUY_CALL:
        case OperationLegType.BUY_PUT:
          netPremium = netPremium.minus(legValue.times(CONTRACT_SIZE));
          break;
        case OperationLegType.SELL_CALL:
        case OperationLegType.SELL_PUT:
          netPremium = netPremium.plus(legValue.times(CONTRACT_SIZE));
          break;
        case OperationLegType.BUY_STOCK:
          netPremium = netPremium.minus(legValue);
          break;
        case OperationLegType.SELL_STOCK:
          netPremium = netPremium.plus(legValue);
          break;
      }
    }

    return netPremium.toNumber();
  }

  /**
   * Calculate risk profile for a strategy
   */
  async getStrategyRiskProfile(
    strategyType: StrategyType,
    legs: OperationLegInput[],
  ): Promise<StrategyRiskProfile> {
    const netPremium = this.calculateNetPremium(legs);
    const isDebitStrategy = netPremium < 0;

    let maxLoss: number | null = null;
    let maxGain: number | null = null;
    const breakEvenPoints: number[] = [];
    let marginRequired = 0;

    const optionLegs = legs.filter(
      (l) =>
        l.legType !== OperationLegType.BUY_STOCK &&
        l.legType !== OperationLegType.SELL_STOCK,
    );

    const optionDetails: Map<
      string,
      { strikePrice: number; optionType: 'CALL' | 'PUT' }
    > = new Map();

    for (const leg of optionLegs) {
      const asset = await this.prisma.asset.findUnique({
        where: { ticker: leg.ticker },
        include: { optionDetail: true },
      });

      if (asset?.optionDetail) {
        optionDetails.set(leg.ticker, {
          strikePrice: Number(asset.optionDetail.strikePrice),
          optionType: asset.optionDetail.optionType,
        });
      }
    }

    switch (strategyType) {
      case StrategyType.SINGLE_OPTION:
        if (legs.length === 1) {
          const leg = legs[0];
          const isBuy =
            leg.legType === OperationLegType.BUY_CALL ||
            leg.legType === OperationLegType.BUY_PUT;

          if (isBuy) {
            maxLoss = Math.abs(netPremium);
            maxGain = null;
          } else {
            maxLoss = null;
            maxGain = Math.abs(netPremium);

            const detail = optionDetails.get(leg.ticker);
            if (detail && leg.legType === OperationLegType.SELL_PUT) {
              marginRequired =
                detail.strikePrice * CONTRACT_SIZE * leg.quantity;
            }
          }
        }
        break;

      case StrategyType.STRADDLE:
        maxLoss = Math.abs(netPremium);
        maxGain = null;
        break;

      case StrategyType.COVERED_CALL: {
        const stockLeg = legs.find(
          (l) => l.legType === OperationLegType.BUY_STOCK,
        );
        const callLeg = legs.find(
          (l) => l.legType === OperationLegType.SELL_CALL,
        );

        if (stockLeg && callLeg) {
          const callDetail = optionDetails.get(callLeg.ticker);
          if (callDetail) {
            const stockCost = stockLeg.price * stockLeg.quantity;
            const premiumReceived =
              callLeg.price * callLeg.quantity * CONTRACT_SIZE;
            maxGain =
              (callDetail.strikePrice - stockLeg.price) * stockLeg.quantity +
              premiumReceived;
            maxLoss = stockCost - premiumReceived;
            breakEvenPoints.push(stockLeg.price - callLeg.price);
          }
        }
        break;
      }

      case StrategyType.PROTECTIVE_PUT: {
        const stockLegPP = legs.find(
          (l) => l.legType === OperationLegType.BUY_STOCK,
        );
        const putLegPP = legs.find(
          (l) => l.legType === OperationLegType.BUY_PUT,
        );

        if (stockLegPP && putLegPP) {
          const putDetail = optionDetails.get(putLegPP.ticker);
          if (putDetail) {
            const premiumPaid =
              putLegPP.price * putLegPP.quantity * CONTRACT_SIZE;
            maxLoss =
              (stockLegPP.price - putDetail.strikePrice) * stockLegPP.quantity +
              premiumPaid;
            maxGain = null;
            breakEvenPoints.push(stockLegPP.price + putLegPP.price);
          }
        }
        break;
      }

      default:
        if (isDebitStrategy) {
          maxLoss = Math.abs(netPremium);
        }
    }

    for (const leg of legs) {
      if (leg.legType === OperationLegType.SELL_PUT) {
        const detail = optionDetails.get(leg.ticker);
        if (detail) {
          marginRequired += detail.strikePrice * CONTRACT_SIZE * leg.quantity;
        }
      }
    }

    return {
      maxLoss,
      maxGain,
      breakEvenPoints,
      netPremium,
      marginRequired,
      isDebitStrategy,
    };
  }

  /**
   * Get a preview of a strategy before execution
   */
  async previewStrategy(
    strategyType: StrategyType,
    legs: OperationLegInput[],
  ): Promise<StrategyPreviewResponse> {
    const validation = await this.validateCustomStrategy(legs);
    const riskProfile = await this.getStrategyRiskProfile(strategyType, legs);
    const totalCost = riskProfile.isDebitStrategy
      ? Math.abs(riskProfile.netPremium)
      : 0;

    return {
      strategyType,
      legs,
      riskProfile,
      totalCost,
      isValid: validation.isValid,
      validationErrors: validation.errors,
    };
  }
}
