# Briefing de Redesign — Página de Análises

> Documento de negócio para redesenho visual. Quem ler este arquivo é um designer/agente de design que vai propor melhorias estéticas na página, com acesso ao código mas sem contexto histórico. Aqui está tudo que ele precisa saber sobre **o que** a página entrega, não **como**.

---

## 1. Visão geral da página

A página de Análises é o painel estratégico do assessor de investimentos. Ela reúne, em um único lugar, todos os indicadores necessários para o assessor ter uma visão consolidada da saúde das carteiras que ele gerencia: performance, riscos operacionais, composição e ranking dos clientes.

O assessor abre essa página quando quer responder perguntas do tipo: "Como estão indo as carteiras no mês?", "Quais ativos estão me trazendo mais resultado?", "Algum cliente tem opção prestes a vencer?", "Preciso agir com algum cliente agora?". A página serve tanto para a rotina diária de monitoramento quanto para a preparação de reuniões com clientes.

---

## 2. Elementos transversais

Esses elementos ficam no topo da página e afetam o comportamento de todos (ou quase todos) os gráficos e tabelas ao mesmo tempo.

- **Toggle "Consolidado / Carteira":** Controla o escopo dos dados. No modo **Consolidado**, todos os widgets mostram dados somados de todos os clientes do assessor — a visão macro do negócio. No modo **Carteira**, o assessor seleciona uma carteira específica de um cliente em um menu suspenso, e os widgets filtram para mostrar apenas aquela carteira. Alguns widgets (Ações Pendentes e Ranking de Clientes) não são afetados por esse filtro e sempre mostram dados de todos os clientes.

- **Filtro de período:** Botões de atalho para janelas de tempo pré-definidas: **1M** (último mês), **3M** (3 meses), **6M** (6 meses), **1A** (1 ano), **YTD** (do início do ano até hoje) e **Personalizado** (o assessor digita uma data de início e uma data de fim). O padrão ao abrir a página é **1M**. Afeta os widgets de performance, dividendos e evolução, mas não afeta os widgets de risco operacional (Opções a Vencer, Ações Pendentes, Concentração, Setor).

- **Botão "Atualizar dados":** Força uma nova busca dos dados em todos os widgets ao mesmo tempo, descartando o que estava em memória. Útil quando o assessor acabou de registrar uma operação e quer ver o painel refletindo a mudança imediatamente.

---

## 3. Widgets implementados

### Widget 1 — Evolução Patrimonial

- **O que mostra:** Um gráfico de linha que traça o valor total do patrimônio gerenciado ao longo do tempo, do início ao fim do período selecionado. Acima do gráfico, um número em destaque indica a variação percentual total no período (ex: +3,42% em verde ou −1,20% em vermelho).
- **Pergunta de negócio que responde:** "Eu consegui crescer o patrimônio dos meus clientes neste período?"
- **Como o assessor usa:** Ele olha a tendência da linha para identificar se houve crescimento consistente, quedas pontuais ou estagnação. Ao passar o mouse sobre a linha, vê o valor exato do patrimônio em cada data.
- **Visualização atual:** Gráfico de linha única (azul) com eixo X mostrando datas e eixo Y mostrando valores em reais abreviados (ex: "120k").
- **Estados:** Com dados — exibe o gráfico e a variação percentual. Sem dados no período — exibe a mensagem "Sem dados no período." Em carregamento — exibe três barras de esqueleto animadas.

---

### Widget 2 — Rentabilidade vs IBOV

- **O que mostra:** Um gráfico de linha dupla que compara, ao longo do tempo, a rentabilidade acumulada (em percentual) das carteiras do assessor com a rentabilidade do índice Bovespa (IBOV) no mesmo período. Cada linha tem cor diferente e uma legenda identifica qual é qual.
- **Pergunta de negócio que responde:** "Eu estou batendo o mercado? Meus clientes estão rendendo mais ou menos que o índice de referência?"
- **Como o assessor usa:** Ele compara a posição relativa das duas linhas ao longo do período. Se a linha da carteira ficar acima da linha do IBOV no final, ele está superando o benchmark. Ao passar o mouse, vê os percentuais exatos de cada linha em qualquer ponto.
- **Visualização atual:** Gráfico de linha com duas séries (azul para a carteira, amarelo para o IBOV), com legenda abaixo do gráfico. Eixo Y em percentual.
- **Estados:** Com dados — exibe o gráfico com as duas linhas. Sem dados — exibe mensagem "Sem dados no período." Em carregamento — esqueleto animado.

---

### Widget 3 — Melhores e Piores Ativos

- **O que mostra:** Duas listas lado a lado: à esquerda, os ativos com maiores ganhos no período; à direita, os ativos com maiores perdas. Para cada ativo, mostra o código do papel (ticker), o nome do cliente associado (no modo Consolidado), o resultado em reais (R$) e a variação percentual.
- **Pergunta de negócio que responde:** "Quais ativos estão puxando os resultados para cima ou para baixo? Há algum ativo problemático que precisa de atenção?"
- **Como o assessor usa:** Ele verifica se os ativos com melhores resultados justificam manutenção da posição e se os piores merecem revisão ou encerramento. No modo Consolidado, o nome do cliente ajuda a identificar qual carteira tem o ativo.
- **Visualização atual:** Duas listas (não gráfico) com ícone de seta para cima nos ganhos e seta para baixo nas perdas. Resultado em reais em verde (ganho) ou vermelho (perda), percentual abaixo em cinza menor.
- **Estados:** Com dados — exibe as duas listas. Sem dados — as listas ficam vazias. Em carregamento — esqueleto animado.

---

### Widget 4 — Risco de Vencimento de Opções

- **O que mostra:** Um gráfico de barras horizontais que agrupa as opções por janelas de vencimento (ex: "próximos 7 dias", "8–30 dias", "31–60 dias") e mostra o valor financeiro total em opções em cada janela. As barras têm cores diferentes por janela, sugerindo urgência (vermelho para mais próximo, azul para mais distante).
- **Pergunta de negócio que responde:** "Eu tenho opções vencendo em breve? Quanto de dinheiro está exposto nos próximos dias?"
- **Como o assessor usa:** Ele vê as barras e identifica se há concentração de vencimentos nos próximos dias que exija ação imediata (renovação, exercício ou encerramento da posição). Ao passar o mouse sobre uma barra, vê o valor total da janela.
- **Visualização atual:** Gráfico de barras horizontais com cores sequenciais por janela (vermelho, laranja, amarelo, azul, cinza). Eixo X em reais, eixo Y com o nome da janela de tempo.
- **Estados:** Com dados — exibe as barras. Sem opções com vencimento futuro — exibe mensagem "Sem opções com vencimento futuro." Em carregamento — esqueleto animado.

---

### Widget 5 — Ações Pendentes

- **O que mostra:** Uma lista de alertas operacionais que requerem ação do assessor. Cada item tem um ícone de severidade (crítico = vermelho, aviso = amarelo), uma descrição da situação, o nome do cliente envolvido e um link para navegar diretamente para a tela relevante.
- **Pergunta de negócio que responde:** "O que eu preciso fazer hoje? Quais clientes exigem atenção imediata?"
- **Como o assessor usa:** Ele lê a lista de cima para baixo (os mais críticos primeiro) e clica em "Ver detalhes" para navegar diretamente ao problema — seja uma opção vencendo, um cliente inativo, ou outra situação que precisa de resolução.
- **Visualização atual:** Lista vertical com ícones de alerta (círculo vermelho ou triângulo amarelo), texto da descrição em cinza escuro, nome do cliente em cinza claro e link azul "Ver detalhes".
- **Estados:** Com pendências — exibe a lista. Sem pendências — exibe mensagem "Nenhuma ação pendente." Em carregamento — esqueleto animado. Não é afetado pelo filtro de período ou pelo toggle Consolidado/Carteira.

---

### Widget 6 — Proventos Recebidos

- **O que mostra:** Três informações combinadas: (1) um número em destaque com o total de dividendos e juros sobre capital recebidos no período; (2) um gráfico de barras verticais mostrando quanto foi recebido por mês; (3) uma lista dos ativos que mais pagaram proventos no período.
- **Pergunta de negócio que responde:** "Meus clientes estão recebendo renda passiva? Qual ativo está gerando mais proventos?"
- **Como o assessor usa:** Ele olha o total para ter a dimensão da renda gerada, vê o gráfico mensal para identificar sazonalidade (meses que historicamente pagam mais) e consulta a lista de top pagadores para entender de onde vem a renda.
- **Visualização atual:** Card com o total acima do gráfico (texto "Total no período: R$ X.XXX,XX"), barras azuis mensais e uma seção "Top pagadores" abaixo com lista de ticker, nome e valor total.
- **Estados:** Com dados — exibe tudo. Sem dados — a seção de top pagadores some, as barras ficam zeradas. Em carregamento — esqueleto animado.

---

### Widget 7 — Concentração de Ativos

- **O que mostra:** Uma tabela com todos os ativos que compõem as carteiras, ordenados por concentração. Para cada ativo: código, valor em reais, percentual do total do portfólio, quantidade de clientes que têm aquele ativo e rentabilidade. Ativos com excesso de peso são destacados em amarelo claro; ativos com excesso de concentração em clientes são destacados em vermelho claro.
- **Pergunta de negócio que responde:** "Estou concentrado demais em algum ativo? Algum ativo está presente em clientes demais, gerando risco sistêmico?"
- **Como o assessor usa:** Ele varre a tabela buscando linhas destacadas — amarelo indica que um ativo ocupa um percentual acima do ideal no portfólio total; vermelho indica que muitos clientes têm aquele mesmo ativo, o que significa que uma queda naquele papel afeta muita gente ao mesmo tempo.
- **Visualização atual:** Tabela com 5 colunas (Ativo, Valor, % Book, Clientes, Rentabilidade). Linhas com fundo amarelo claro (sobrepeso) ou vermelho claro (superconcentrado). Rentabilidade em verde ou vermelho conforme positiva ou negativa.
- **Estados:** Com dados — exibe a tabela. Sem posições — exibe mensagem "Sem posições." Em carregamento — esqueleto animado.

---

### Widget 8 — Exposição Setorial

- **O que mostra:** Um gráfico de barras horizontais com um setor da economia por linha (ex: Energia, Financeiro, Tecnologia, Agronegócio), mostrando qual percentual do portfólio total está alocado em cada setor.
- **Pergunta de negócio que responde:** "Meu portfólio está diversificado entre setores? Estou muito concentrado em algum setor específico?"
- **Como o assessor usa:** Ele identifica visualmente quais setores dominam o portfólio e se há equilíbrio ou concentração excessiva. Ao passar o mouse sobre uma barra, vê o percentual exato.
- **Visualização atual:** Gráfico de barras horizontais com todas as barras na mesma cor (roxo/índigo). Eixo X em percentual, eixo Y com o nome do setor.
- **Estados:** Com dados — exibe o gráfico. Sem dados — exibe mensagem "Sem dados setoriais." Em carregamento — esqueleto animado.

---

### Widget 9 — Ranking de Clientes

- **O que mostra:** Uma tabela que lista todos os clientes do assessor com seus principais indicadores financeiros: patrimônio total, rentabilidade no período, resultado em reais, data da última operação registrada e número de alertas críticos. O assessor pode clicar nos cabeçalhos para reordenar a tabela por qualquer uma dessas colunas.
- **Pergunta de negócio que responde:** "Quem são meus melhores clientes em resultado? Quem está há mais tempo sem nenhuma operação? Quem tem mais alertas?"
- **Como o assessor usa:** Ele ordena a tabela de formas diferentes conforme o contexto: por rentabilidade para ver quem está performando melhor; por alertas para ver quem precisa de atenção urgente; por última operação para identificar clientes inativos que podem estar precisando de acompanhamento.
- **Visualização atual:** Tabela com 6 colunas (Cliente, Patrimônio, Rentabilidade, Resultado, Última operação, Alertas). Cabeçalhos de colunas ordenáveis são clicáveis. Rentabilidade e resultado em verde ou vermelho. Última operação acima de 90 dias aparece em laranja. Alertas críticos aparecem em vermelho; se zero, aparece um traço.
- **Estados:** Com dados — exibe a tabela. Sem dados — exibe mensagem "Sem dados." Em carregamento — esqueleto animado. Não é afetado pelo toggle Consolidado/Carteira nem pelo filtro de período.

---

## 4. Padrão visual atual do sistema

O Advision passou por uma migração visual: a maioria das telas já usa o novo sistema de design chamado internamente de **Sovereign**. A página de Análises ainda não foi migrada e usa o visual antigo (fundo branco, bordas cinzas). O redesign deve trazer a página de Análises para o padrão Sovereign.

- **Paleta de cores (Sovereign):**
  - **Fundo principal:** Azul-marinho profundo (`#070f1c` — quase preto)
  - **Superfície de cards:** Azul-marinho escuro, dois tons: mais escuro (`#0d1b2a`) e médio (`#112233`)
  - **Superfície interativa/elevada:** Azul-aço (`#1e3347`, `#263e54`)
  - **Cor primária (ações, positivo leve):** Verde-esmeralda médio (`#10b981`)
  - **Cor terciária (destaques positivos, ganhos):** Verde-esmeralda brilhante (`#34d399`)
  - **Cor de erro/alerta crítico:** Rosa-avermelhado suave (`#fca5a5`)
  - **Texto principal:** Branco (`#ffffff`)
  - **Texto secundário/rótulos:** Cinza-ardósia claro (`#94a3b8`)
  - **Bordas sutis:** Cinza-ardósia escuro com 10% de opacidade (`#334155`)
  - **Amarelo/aviso:** Âmbar (`#fbbf24`) — usado em operações pendentes

- **Tipografia:**
  - **Fonte de títulos e valores em destaque:** Manrope (peso bold, extrabold, black) com `letter-spacing` apertado (`tracking-tight`, `tracking-tighter`)
  - **Fonte de corpo e tabelas:** Inter (peso regular, medium, semibold)
  - **Rótulos de categoria:** Maiúsculas, espaçamento amplo (`tracking-widest`, `tracking-wider`), tamanho mínimo (10–11px), peso extrabold — estilo "etiqueta"

- **Cards e contêineres:**
  - Raio de borda grande: `rounded-[2rem]` (32px) para cards principais, `rounded-2xl` (24px) para cards secundários e células de tabela
  - Sem sombra pesada — apenas `border border-outline-variant/10` (borda quase invisível)
  - Fundo diferenciado por nível de elevação: quanto mais elevado o elemento, mais claro o tom de azul-marinho

- **Espaçamento:**
  - Padding interno de cards: 24px (p-6) a 32px (p-8) nos cards hero; 16px (p-4) nos cards menores
  - Gap entre cards: 24px (gap-6) a 32px (gap-8)
  - Elementos internos espaçados com hierarquia clara: rótulo acima, valor grande abaixo, subtexto menor abaixo do valor

- **Library de componentes:**
  - Tailwind CSS com tokens customizados (sem biblioteca de componentes externa como shadcn, MUI ou Chakra)
  - Ícones: Lucide React (tamanho padrão 16–22px)
  - Gráficos: Recharts (já em uso na página de Análises)
  - Animações de entrada: Framer Motion (`motion/react`) — usado no dashboard principal com fade+slide

- **Convenções de feedback visual:**
  - **Positivo/ganho:** Verde-esmeralda (`text-tertiary` = `#34d399`)
  - **Negativo/perda:** Rosa-avermelhado (`text-error` = `#fca5a5`)
  - **Alerta/aviso:** Âmbar (`text-amber-400`)
  - **Loading:** Componente `LoadingSpinner` (spinner circular centralizado) ou esqueleto com `animate-pulse` nos tons de azul-marinho
  - **Bordas de destaque:** Borda lateral esquerda colorida (`border-l-4`) para alertas em cards — vermelho (crítico), verde (oportunidade), cinza (informativo)
  - Botões de ação dentro de cards: fundo `bg-surface-container-high`, arredondados (`rounded-full`), texto em branco, hover para `bg-surface-container-highest`

---

## 5. Diagnóstico visual atual da página de Análises

A página de Análises foi implementada com o visual antigo do sistema — antes da migração para o tema Sovereign. É a única página do sistema que ainda usa fundo branco, bordas cinzas claras e tons azuis claro como cor de destaque. O contraste com o restante do sistema é imediato e notável.

### 5.1 Problemas que afetam toda a página

- **Tema incompatível com o restante do sistema:** Toda a página usa fundo branco (`#ffffff`), bordas cinza claro, texto cinza escuro e azul-600 como cor de destaque. Ao navegar do dashboard principal (fundo escuro, verde-esmeralda) para a página de Análises, parece que o usuário acessou um sistema diferente. Este é o problema mais grave.

- **Cards com visual antigo:** Todos os 9 widgets usam o mesmo container branco com borda fina cinza e cantos menos arredondados (`rounded-xl` = 12px vs o padrão atual de 32px). Sem elevação visual nem diferenciação de plano.

- **Sem hierarquia visual entre widgets:** Todos os 9 widgets ocupam o mesmo espaço em uma grade de 3 colunas simétricas, com o mesmo peso visual. Widgets mais importantes (como Evolução Patrimonial, que é a informação de maior impacto) não têm nenhum destaque especial em relação a widgets menores (como o link de Ações Pendentes).

- **Controles do topo (toggle e filtro de período) sem identidade:** O toggle "Consolidado/Carteira" e os botões de período usam `bg-blue-600` quando ativos, que não faz parte da paleta Sovereign. Em um fundo escuro, o tom seria completamente estranho.

- **Botão "Atualizar dados" invisível no tema escuro:** Estilo atual: borda cinza, texto cinza claro, hover cinza levíssimo — pensado para fundo branco, ficaria sem contraste no fundo escuro.

### 5.2 Problemas em widgets específicos

- **Widget 1 — Evolução Patrimonial:** Linha do gráfico em azul-600 (`#3b82f6`) sem relação com a paleta Sovereign. O número de variação percentual (+/−%) está muito pequeno e misturado ao título ("text-xs text-gray-400") — não tem hierarquia de destaque. Não há valor absoluto (início e fim do período) em destaque. O eixo X provavelmente mostra datas no formato ISO bruto (ex: "2025-04-01") sem formatação amigável.

- **Widget 2 — Rentabilidade vs IBOV:** Duas linhas em azul e âmbar — nenhuma usa a cor semântica do sistema (verde para positivo, rosa para negativo). A legenda fica abaixo do gráfico em texto pequeno sem rótulos de performance (ex: sem badge mostrando "+3,2% carteira / −1,1% IBOV" no final do período). Nenhum indicador visual rápido de quem ganhou mais.

- **Widget 3 — Melhores e Piores Ativos:** Verde e vermelho corretos semanticamente, mas nos tons antigos (green-600, red-500) em vez dos tokens Sovereign (tertiary, error). Lista sem separação visual adequada — border-b `border-gray-50` praticamente invisível mesmo no tema claro. Nome do cliente em "text-xs text-gray-400" está ilegível no tamanho atual.

- **Widget 4 — Risco de Vencimento de Opções:** A paleta de cores das barras (vermelho → laranja → amarelo → azul → cinza) é sequencial, mas sem semântica clara. Vermelho normalmente indica urgência máxima, o que faz sentido para a janela mais próxima, mas azul e cinza para as janelas mais distantes não comunicam risco decrescente de forma intuitiva. Nenhum número de contratos exibido, apenas valor total.

- **Widget 5 — Ações Pendentes:** Ícones de alerta corretos (círculo vermelho, triângulo amarelo), mas o link "Ver detalhes" em azul-500 (`text-blue-500`) soa deslocado na paleta Sovereign. Sem badge de contagem total de pendências no cabeçalho do widget ("3 pendências críticas"). Os itens não têm separação visual clara (apenas `space-y-2`).

- **Widget 6 — Proventos Recebidos:** Barras todas azuis (cor única `#3b82f6`) sem variação de tom por mês — não há como identificar sazonalidade visualmente. O total "R$ X.XXX,XX" está embutido em texto corrido ("Total no período: R$ X.XXX,XX") em vez de ser um número em destaque com tipografia Manrope. A lista de "Top pagadores" é texto cru sem nenhuma barra de proporção ou indicação visual de quem pagou mais.

- **Widget 7 — Concentração de Ativos:** Os fundos de linha de alerta (`bg-yellow-50`, `bg-red-50`) são cores de tema claro — em tema escuro ficam invisíveis. As colunas `% Book` e `Clientes` (as mais importantes para detectar risco) não têm nenhuma barra visual proporcional — são apenas números. Sem cabeçalho fixo: ao rolar, as colunas perdem referência.

- **Widget 8 — Exposição Setorial:** Todas as barras na mesma cor (`#6366f1` — índigo) sem distinção entre setores. Uma paleta com cores por setor (energia = laranja, financeiro = azul, agro = verde) comunicaria a composição muito mais rapidamente. O eixo X em percentual não formata como "20%" — exibe "20" sem símbolo.

- **Widget 9 — Ranking de Clientes:** Cabeçalhos ordenáveis não têm indicador visual do estado de ordenação atual (nenhum ícone de seta ou destaque na coluna ativa). A coluna "Última operação" exibe "90d", "12d" etc. sem indicação contextual do que significa um número alto (assessor precisa inferir que >90d = cliente inativo). Tabela com 6 colunas em `text-xs` em 1/3 da largura da tela — muito densa.

### 5.3 Inconsistências com o restante do sistema

- Toda a página usa fundo branco e bordas cinza; todo o restante do sistema usa fundo azul-marinho escuro.
- Cor de destaque ativo: azul-600 na página de Análises; verde-esmeralda no restante.
- Raio de borda: 12px nos widgets de Análises; 32px nos cards do dashboard e de carteiras.
- Tipografia de títulos e valores: sem uso de Manrope nem de uppercase tracking; o restante usa extensivamente.
- Feedback de carregamento: esqueleto em cinza claro (`bg-gray-100`) na Análises; spinner circular ou esqueleto em tons de azul-marinho no restante.
- Feedback de cor de resultado: `text-green-600` e `text-red-500` na Análises; `text-tertiary` e `text-error` no restante.
- Animações de entrada: ausentes na Análises; `motion/react` com fade+slide no dashboard.
- Estado vazio: mensagem de texto simples em cinza na Análises; sem padrão definido em outras telas (oportunidade de estabelecer o padrão).

---

## 6. Restrições e diretrizes para o redesign

- **Não alterar:** o que cada widget mostra (dados, fontes, lógica de negócio, campos exibidos). Apenas a forma visual.
- **Manter compatível com:** o padrão visual Sovereign já estabelecido nas demais telas do Advision (ver seção 4): paleta escura, verde-esmeralda, Manrope, tokens semânticos de cor.
- **Permitido reorganizar:** ordem dos widgets, agrupamentos por categoria, abas, tamanhos relativos dos cards (grid assimétrico) — desde que respeite a relevância de negócio descrita para cada widget.
- **Considerar:** estados vazios com ilustração ou mensagem contextual, estados de carregamento com esqueleto no tom escuro, comportamento em telas de largura média (tablet, laptop menor).
- **Gráficos (Recharts):** as cores das séries, eixos, tooltips e grades de fundo devem ser atualizadas para a paleta Sovereign. A biblioteca permanece a mesma.

---

## 7. O que o agente de design deve entregar

- **Proposta visual concreta** para cada um dos 9 widgets, incluindo: cores das séries de gráfico, tipografia de títulos e valores em destaque, cores dos estados (vazio, erro), e cores de feedback semântico (positivo/negativo/alerta).
- **Proposta de reorganização do layout**, se aplicável — por exemplo, dar ao Widget 1 (Evolução Patrimonial) um espaço maior como card "hero" da página, com os demais widgets em hierarquia secundária.
- **Catálogo de mudanças por widget** no formato Antes / Depois descrevendo especificamente o que muda visualmente em cada um.
- **Diretrizes de paleta de cores para gráficos:** quais cores usar para séries positivas, negativas, neutras e de destaque — alinhadas com os tokens Sovereign.
- **Tipografia e hierarquia:** como aplicar Manrope e Inter de forma consistente nos títulos dos widgets, valores em destaque, rótulos de eixo e textos de tabela.
- **Controles transversais** (toggle, filtro de período, botão de atualizar): proposta visual compatível com o tema escuro.
- **Estados vazios e de erro** com mensagem clara e, opcionalmente, ação (ex: botão "Tentar novamente" no estado de erro).
- **Considerações de microinterações** úteis: hover em linhas de tabela, transição ao selecionar período, animação de entrada dos cards, tooltip enriquecido nos gráficos.
