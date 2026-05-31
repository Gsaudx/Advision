# Calculadora de Payoff — Diagrama de Lucro/Prejuízo de Opções

## Visão Geral

Este documento descreve a funcionalidade de visualização de payoff de posições em opções, implementada como um modal interativo acessível a partir do `OptionPositionCard`. O usuário clica no botão "Payoff" para abrir um diagrama gráfico que exibe como o lucro ou prejuízo da posição varia conforme o preço do ativo subjacente muda.

O gráfico utiliza `recharts ComposedChart` com zonas preenchidas de lucro (verde) e prejuízo (vermelho), uma linha de payoff e quatro linhas de referência identificando os pontos críticos da posição: strike (K), breakeven (BE), preço atual do subjacente (spot) e a linha zero.

---

## 1. Funcionalidade — Botão Payoff e Modal

### 1.1 Ponto de Entrada

O botão "Payoff" é renderizado condicionalmente dentro do `OptionPositionCard` quando a prop `onPayoff` é fornecida pelo componente pai. Ao ser clicado, dispara `onPayoff(position.id)`.

**Prop adicionada ao `OptionPositionCard`:**

```typescript
onPayoff?: (positionId: string) => void
```

O botão é incluído na verificação de `hasActions`, garantindo que o bloco de ações seja exibido sempre que pelo menos uma ação estiver disponível.

### 1.2 Fluxo de Interação

1. Usuário visualiza o `OptionPositionCard` com o botão "Payoff"
2. Clica no botão → `onPayoff(position.id)` é disparado
3. `WalletPage` recebe o callback → localiza a posição pelo ID → atribui a `payoffPosition`
4. Modal abre com animação suave (fade + scale + translação Y) via Framer Motion
5. Gráfico é renderizado com 100 pontos de dados calculados pela função `computePayoffPoints()`
6. Tooltip interativo aparece ao passar o mouse sobre o gráfico
7. Usuário fecha clicando no botão (X) ou no fundo semitransparente (backdrop)

### 1.3 Estrutura Visual do Modal

```
┌──────────────────────────────────────────────────┐
│  Payoff — [TICKER]                          [X]   │
│  [OPTION TYPE] · Strike [K] · Prêmio [PREMIUM]   │
├──────────────────────────────────────────────────┤
│                                                    │
│  [OptionPositionCard]                             │
│                                                    │
│  Diagrama de Payoff                               │
│                                                    │
│  ┌────────────────────────────────────────────┐  │
│  │  [ComposedChart]                           │  │
│  │  - Área: Lucro (verde com gradiente)       │  │
│  │  - Área: Prejuízo (vermelho com gradiente) │  │
│  │  - Linha: Payoff (cor conforme posição)    │  │
│  │  - Refs: K, BE, Spot, Zero                 │  │
│  │  - Tooltip interativo                      │  │
│  └────────────────────────────────────────────┘  │
│                                                    │
│  Legenda:  [K] [BE] [Spot] [Zero]                │
│                                                    │
└──────────────────────────────────────────────────┘
```

### 1.4 Animações (Framer Motion)

| Elemento | Efeito |
|----------|--------|
| Backdrop | Fade in/out (opacity: 0 → 1) |
| Modal | Fade + scale (0.95 → 1) + translação Y (16px → 0) |
| Spring | `stiffness: 350, damping: 30` |
| Gráfico | `isAnimationActive={false}` (sem animação ao renderizar) |

---

## 2. Fórmulas de Payoff

Os inputs reais utilizados nas fórmulas são extraídos do objeto `optionDetail`:

| Input | Origem |
|-------|--------|
| `optionType` | `optionDetail.optionType` — `'CALL'` ou `'PUT'` |
| `isShort` | Derivado da posição — `true` para vendida, `false` para comprada |
| `K` (strike) | `optionDetail.strikePrice` |
| `premio` | `optionDetail.averagePrice` — prêmio médio por contrato |
| `sAtual` (spot) | `optionDetail.currentUnderlyingPrice` — preço atual do subjacente |

### 2.1 CALL Comprada (Long Call)

```
Payoff = max(S - K, 0) - Prêmio
```

- **S:** Preço do ativo subjacente no cenário analisado
- **K:** Strike price (preço de exercício)
- **Prêmio:** Valor pago pela opção (custo da posição)
- **Ganho:** Ilimitado — cresce linearmente à medida que S supera o breakeven
- **Perda:** Limitada ao prêmio pago (ocorre quando S ≤ K)

**Exemplo numérico (CALL comprada):**

| Cenário | S | Payoff |
|---------|---|--------|
| Abaixo do strike | R$ 22,00 | `max(22 - 25, 0) - 2 = -R$ 2,00` |
| No breakeven | R$ 27,00 | `max(27 - 25, 0) - 2 = R$ 0,00` |
| Acima do breakeven | R$ 32,00 | `max(32 - 25, 0) - 2 = +R$ 5,00` |

*Parâmetros: K = R$ 25,00; Prêmio = R$ 2,00; BE = R$ 27,00*

### 2.2 PUT Comprada (Long Put)

```
Payoff = max(K - S, 0) - Prêmio
```

- **Ganho:** Aumenta conforme o preço do ativo cai abaixo do breakeven
- **Perda:** Limitada ao prêmio pago (ocorre quando S ≥ K)
- **Ganho máximo teórico:** K - Prêmio (quando S = 0)

**Exemplo numérico (PUT comprada):**

| Cenário | S | Payoff |
|---------|---|--------|
| Acima do strike | R$ 28,00 | `max(25 - 28, 0) - 3 = -R$ 3,00` |
| No breakeven | R$ 22,00 | `max(25 - 22, 0) - 3 = R$ 0,00` |
| Abaixo do breakeven | R$ 18,00 | `max(25 - 18, 0) - 3 = +R$ 4,00` |

*Parâmetros: K = R$ 25,00; Prêmio = R$ 3,00; BE = R$ 22,00*

### 2.3 CALL Vendida (Short Call)

```
Payoff = -max(S - K, 0) + Prêmio
```

- **Ganho máximo:** Prêmio recebido (ocorre quando S ≤ K — opção não é exercida)
- **Risco:** Ilimitado — perda cresce linearmente quando S supera K
- **Breakeven:** K + Prêmio (ponto a partir do qual a posição passa a perder)

### 2.4 PUT Vendida (Short Put)

```
Payoff = -max(K - S, 0) + Prêmio
```

- **Ganho máximo:** Prêmio recebido (ocorre quando S ≥ K — opção não é exercida)
- **Risco:** Significativo — perda cresce quando o preço do ativo cai abaixo de K
- **Breakeven:** K - Prêmio

### 2.5 Breakeven

O ponto de breakeven é o preço do ativo subjacente no qual a operação não gera lucro nem prejuízo (payoff = 0):

```
CALL:  BE = K + Prêmio
PUT:   BE = K - Prêmio
```

---

## 3. Estrutura do Gráfico (recharts)

### 3.1 Eixos e Range

O intervalo do eixo X é calculado dinamicamente para garantir que os três pontos críticos (K, spot e BE) estejam sempre visíveis, com uma margem de 20% em cada extremidade:

```typescript
const refs = [K, sAtual, breakeven].filter((v) => v > 0);
const sMin = Math.max(0.01, Math.min(...refs) * 0.8);
const sMax = Math.max(...refs) * 1.2;
```

| Eixo | Configuração |
|------|-------------|
| **XAxis** | Domínio dinâmico (`dataMin` → `dataMax`), 7 ticks, formato `R$XXX` |
| **YAxis** | Automático, formato `R$XXX`, largura fixa de 52px |
| **CartesianGrid** | Apenas linhas horizontais (`vertical={false}`), cinza muito suave |

**Margens do gráfico:**
```typescript
margin={{ top: 28, right: 12, left: 4, bottom: 0 }}
```

### 3.2 Áreas (Lucro e Prejuízo)

Cada ponto de dado (`PayoffPoint`) possui campos separados para as componentes positiva e negativa do payoff, permitindo que duas áreas com cores distintas sejam renderizadas sobre o mesmo domínio:

```typescript
type PayoffPoint = {
  s: number;       // preço do ativo (eixo X)
  payoff: number;  // payoff total
  positive: number; // Math.max(0, payoff) — zona de lucro
  negative: number; // Math.min(0, payoff) — zona de prejuízo
};
```

| Elemento | Tipo | Cor | Propósito |
|----------|------|-----|-----------|
| `Area` (positive) | Area | `rgb(52 211 153)` com gradiente decrescente | Zona de lucro (verde) |
| `Area` (negative) | Area | `rgb(248 113 113)` com gradiente decrescente | Zona de prejuízo (vermelho) |
| `Line` (payoff) | Line | Verde (long) ou Vermelho (short) | Curva de payoff contínua |

Os gradientes usam opacidade decrescente para evitar poluição visual — a linha de payoff e as linhas de referência permanecem legíveis por baixo das áreas.

### 3.3 Linhas de Referência

Todas as `ReferenceLine` utilizam `strokeDasharray` (linhas tracejadas). Os rótulos de identificação (K, BE, Spot) são exibidos acima da linha.

| ReferenceLine | Eixo | Cor | Dash | Propósito |
|---------------|------|-----|------|-----------|
| `y=0` | Y | `rgba(148,163,184,0.55)` — cinza neutro | `"5 4"` | Linha zero — divide lucro de prejuízo |
| `x=K` | X | `rgb(251 191 36)` — amarelo | `"5 4"` | Strike price da opção |
| `x=BE` | X | `rgb(56 189 248)` — azul claro | `"4 5"` | Breakeven da posição |
| `x=spot` | X | `rgb(226 232 240)` — cinza claro | `"4 4"` | Preço atual do ativo subjacente |

**Paleta de cores completa:**

```typescript
const COLORS = {
  zero:      'rgba(148,163,184,0.55)', // Cinza neutro semitransparente
  strike:    'rgb(251 191 36)',         // Amarelo (contraste alto)
  breakeven: 'rgb(56 189 248)',         // Azul claro
  spot:      'rgb(226 232 240)',        // Cinza claro (neutro)
};

const lineColorLong  = 'rgb(52 211 153)';  // Verde — posição comprada
const lineColorShort = 'rgb(248 113 113)'; // Vermelho — posição vendida
```

### 3.4 Tooltip Customizado

O componente `PayoffTooltip` exibe o preço do ativo (eixo X) e o payoff correspondente (eixo Y) ao passar o mouse sobre o gráfico. A cor do payoff é verde para lucro e vermelha para prejuízo.

```typescript
function PayoffTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PayoffPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const { s, payoff } = payload[0].payload;
  const isPos = payoff >= 0;
  return (
    <div className="px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/50 text-sm whitespace-nowrap shadow-xl">
      <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-2">
        Preço do ativo: {formatCurrency(s)}
      </p>
      <p className={`font-semibold font-mono tabular-nums text-base ${isPos ? 'text-tertiary' : 'text-error'}`}>
        {isPos ? '+' : ''}{formatCurrency(payoff)}
      </p>
    </div>
  );
}
```

**Comportamentos do tooltip:**
- Aparece ao passar o mouse sobre qualquer ponto do gráfico
- Fundo semi-opaco para contraste com a área do gráfico
- Sem animação própria (resposta instantânea ao mouse)
- Colore o valor do payoff em verde (`text-tertiary`) ou vermelho (`text-error`)

**Legenda fixa abaixo do gráfico:** exibe os valores formatados de K, BE, spot e a linha zero com suas respectivas cores de identificação.

---

## 4. Implementação Frontend

### 4.1 `computePayoffPoints()`

Função helper pura que gera os 100 pontos de dados para o gráfico. É chamada dentro do `OptionPayoffModal` na fase de renderização.

```typescript
function computePayoffPoints(
  optionType: 'CALL' | 'PUT',
  isShort: boolean,
  K: number,
  premio: number,
  sAtual: number,
): PayoffPoint[] {
  // Gera 100 pontos distribuídos uniformemente no intervalo dinâmico
  const points = 100;
  const breakeven = optionType === 'CALL' ? K + premio : K - premio;
  const refs = [K, sAtual, breakeven].filter((v) => v > 0);
  const sMin = Math.max(0.01, Math.min(...refs) * 0.8);
  const sMax = Math.max(...refs) * 1.2;
  const step = (sMax - sMin) / (points - 1);

  return Array.from({ length: points }, (_, i) => {
    const s = sMin + i * step;
    let payoff: number;
    if (optionType === 'CALL') {
      payoff = isShort
        ? -Math.max(s - K, 0) + premio   // Short Call
        : Math.max(s - K, 0) - premio;   // Long Call
    } else {
      payoff = isShort
        ? -Math.max(K - s, 0) + premio   // Short Put
        : Math.max(K - s, 0) - premio;   // Long Put
    }
    return {
      s,
      payoff,
      positive: Math.max(0, payoff),   // componente para área verde
      negative: Math.min(0, payoff),   // componente para área vermelha
    };
  });
}
```

**Detalhes da implementação:**
- Calcula automaticamente o breakeven com base no tipo (CALL ou PUT)
- O intervalo `[sMin, sMax]` é definido dinamicamente para garantir que K, spot e BE estejam sempre dentro do gráfico com 20% de margem
- A separação em `positive` e `negative` permite que `recharts` preencha as áreas com cores distintas sem sobreposição

### 4.2 `OptionPayoffModal.tsx`

**Arquivo:** `frontend/src/features/derivatives/options/components/OptionPayoffModal.tsx`

Modal animado (Framer Motion) que:
- Recebe as props `position`, `currentTime` e `onClose`
- Chama `computePayoffPoints()` com os dados da posição para gerar os dados do gráfico
- Renderiza o `OptionPositionCard` dentro do modal para contexto da posição
- Apresenta o `ComposedChart` (recharts) com áreas, linha de payoff, linhas de referência e tooltip
- Exibe a legenda com K, BE, spot e zero identificados por cor

**Props:**

```typescript
interface OptionPayoffModalProps {
  position: OptionPosition;   // dados completos da posição
  currentTime: Date;          // usado pelo OptionPositionCard interno
  onClose: () => void;        // fecha o modal
}
```

**Responsividade:**
- Modal: `max-w-5xl` (desktop), `w-full` com padding em mobile
- Gráfico: `ResponsiveContainer` com altura fixa de 300px
- Conteúdo: `overflow-y-auto` para scroll em viewports pequenos

### 4.3 Integração em `WalletPage.tsx`

**Arquivo:** `frontend/src/features/wallets/pages/WalletPage.tsx`

Adicionados na WalletPage:

1. **Import** do `OptionPayoffModal`
2. **Estado local:** `const [payoffPosition, setPayoffPosition] = useState<OptionPosition | null>(null)`
3. **Handler:**

```typescript
function handlePayoff(positionId: string) {
  const position = optionPositions.find((p) => p.id === positionId) ?? null;
  setPayoffPosition(position);
}
```

4. **Renderização condicional** do modal ao final da página:

```tsx
{payoffPosition && (
  <OptionPayoffModal
    position={payoffPosition}
    currentTime={currentTime}
    onClose={() => setPayoffPosition(null)}
  />
)}
```

O estado `payoffPosition` segue o mesmo padrão já utilizado para `editingPosition` e `deletingPosition` — mantém a consistência arquitetural da página.

---

## 5. Arquivos Novos e Modificados

| Arquivo | Tipo | Mudança | Linhas |
|---------|------|---------|--------|
| `frontend/src/features/derivatives/options/components/OptionPayoffModal.tsx` | **Novo** | Modal + gráfico de payoff | 283 |
| `frontend/src/features/derivatives/options/components/OptionPositionCard.tsx` | Modificado | +prop `onPayoff`; +botão "Payoff"; +verificação `hasActions` | +15 |
| `frontend/src/features/derivatives/options/components/index.ts` | Modificado | +`export * from './OptionPayoffModal'` | +1 |
| `frontend/src/features/wallets/pages/WalletPage.tsx` | Modificado | +import; +estado `payoffPosition`; +`handlePayoff`; +renderização do modal | +17 |

**Total:** 4 arquivos alterados, 1 novo, aproximadamente 316 linhas adicionadas.

---

## 6. Decisões Arquiteturais

### 6.1 Estado em WalletPage (não em contexto global)

O estado `payoffPosition` reside na `WalletPage` em vez de um contexto React ou store global. Justificativa: consistente com o padrão já estabelecido para `editingPosition` e `deletingPosition`. O modal de payoff é uma funcionalidade de visualização pontual — sobre-engenharia seria contraproducente.

### 6.2 Cálculo de Payoff 100% no Frontend

Os dados necessários (strike, prêmio, tipo de opção) já estão disponíveis localmente. Não há necessidade de roundtrip ao backend. As fórmulas são determinísticas e baseadas em matemática financeira padrão. Resultado: interatividade instantânea sem latência de rede.

### 6.3 100 Pontos de Dados

Suficiente para produzir uma curva visualmente suave sem over-sampling. Evita re-renders excessivos e mantém desempenho adequado em dispositivos com menor capacidade de processamento.

### 6.4 Intervalo Dinâmico (80% a 120%)

Em vez de um intervalo fixo, o range do gráfico é calculado a partir dos pontos críticos reais (K, spot, BE). Garante que nenhum ponto crítico seja cortado, adapta-se a diferentes magnitudes de preço (ações, BDRs, criptoativos) e fornece 20% de contexto visual em cada extremidade.

### 6.5 Gradientes nas Áreas

As zonas de lucro e prejuízo usam gradientes lineares com opacidade decrescente. Evita poluição visual — a linha de payoff e as linhas de referência permanecem legíveis por baixo das áreas coloridas.

### 6.6 ComposedChart em vez de LineChart ou AreaChart

O `ComposedChart` do recharts permite combinar em um único gráfico: Áreas (lucro/prejuízo) + Linha (payoff) + `ReferenceLine`s (K, BE, spot, zero). Também oferece controle fino sobre a ordem de renderização — áreas são desenhadas primeiro, depois a linha de payoff por cima.

---

## 7. Comportamentos Esperados por Tipo de Opção

| Tipo de Opção | Perda Máxima | Ganho Máximo | Breakeven | Formato da Curva |
|---------------|-------------|-------------|-----------|-----------------|
| **CALL Comprada** | Prêmio pago | Ilimitado | K + Prêmio | Flat até K → sobe linearmente acima do BE |
| **PUT Comprada** | Prêmio pago | K - Prêmio (S → 0) | K - Prêmio | Desce linearmente abaixo do BE → flat acima de K |
| **CALL Vendida** | Ilimitado | Prêmio recebido | K + Prêmio | Flat acima de K (ganho = prêmio) → cai linearmente acima do BE |
| **PUT Vendida** | K - Prêmio (S → 0) | Prêmio recebido | K - Prêmio | Flat abaixo de K (ganho = prêmio) → sobe linearmente abaixo do BE |

**Regra geral das linhas de referência:**
- **K (amarelo):** Ponto a partir do qual a opção começa a ter valor intrínseco
- **BE (azul claro):** Ponto em que o payoff cruza zero — acima (CALL long) ou abaixo (PUT long) representa lucro
- **Spot (cinza claro):** Posição atual do ativo; indica em qual região da curva a posição se encontra no momento
- **Zero (cinza neutro):** Eixo horizontal de referência; área acima = lucro, abaixo = prejuízo

---

## 8. Gaps e Limitações Conhecidos

### 8.1 Preço Atual do Subjacente Presumido

Se `currentUnderlyingPrice` não estiver disponível no objeto de posição, o código assume `sAtual = K` (strike). Consequência: a `ReferenceLine` do spot não é renderizada e o intervalo do gráfico é baseado apenas em K e BE.

**Solução futura:** integrar com API de preços em tempo real para garantir que o spot seja sempre atualizado.

### 8.2 Sem Suporte a Estratégias Estruturadas (Spreads)

O modal opera sobre posições isoladas (single option leg). Estratégias compostas — call spread, put spread, butterfly, straddle — não têm suporte. Usuários com múltiplas legs precisam visualizar cada posição separadamente.

**Solução futura:** estender `computePayoffPoints()` para aceitar um array de legs e calcular o payoff combinado.

### 8.3 Sem Modelagem de Tempo (Theta) ou Volatilidade Implícita (IV)

O gráfico exibe o payoff **no vencimento** (payoff intrínseco). Não incorpora decay temporal (theta) nem mudanças de volatilidade implícita. O comportamento real de uma opção intraday será diferente do diagrama exibido.

**Solução futura:** adicionar toggle ou aba para simular payoff em datas intermediárias usando modelo Black-Scholes.

### 8.4 Sem Análise de Greeks

Não há cálculo de Delta, Gamma, Vega, Theta ou Rho. Usuários avançados que precisam de métricas de sensibilidade não têm essas informações disponíveis no modal atual.

**Solução futura:** painel lateral de Greeks + cálculo de cenários de stress (what-if para variações de IV e tempo).

### 8.5 Sobreposição de Rótulos em Ranges Apertados

Quando K e BE são muito próximos (diferença < 1% do intervalo do gráfico — tipicamente em casos de prêmios muito baixos), os rótulos "K" e "BE" podem se sobrepor e tornar-se ilegíveis.

**Solução futura:** algoritmo de posicionamento dinâmico de rótulos com detecção de colisão.
