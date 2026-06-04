# Notificações — Alertas de Vencimento de Opções

## 1. Visão Geral

O módulo de Notificações monitora automaticamente todas as posições de opções do assessor e emite alertas antecipados de vencimento. O objetivo é que o assessor nunca seja surpreendido por uma opção vencendo sem que ele tenha tomado uma decisão consciente sobre ela.

---

## 2. Problema que Resolve

Assessores gerenciam simultaneamente múltiplas carteiras de clientes, cada uma podendo conter diversas posições de opções com datas de vencimento distintas. Sem um sistema centralizado de alertas, o assessor precisa navegar carteira por carteira para identificar posições críticas — um processo manual, propenso a falhas e que não escala conforme a base de clientes cresce.

---

## 3. Objetivos

- Garantir que o assessor saiba, com antecedência configurável, quais opções estão próximas do vencimento em qualquer carteira de qualquer cliente.
- Escalar automaticamente a urgência do alerta conforme a data se aproxima.
- Ser silencioso quando não há nada a fazer e intrusivo apenas quando necessário.

---

## 4. Escopo

**O que faz:**
- Gera alertas de vencimento para todas as posições de opções abertas do assessor.
- Classifica alertas em três níveis de severidade (informativo, atenção, crítico).
- Reativa alertas já lidos quando a severidade aumenta.
- Permite ao assessor configurar a janela de antecedência (1 a 30 dias) e desabilitar o sistema globalmente.
- Exibe os alertas no header da aplicação via sino com badge.

**O que não faz:**
- Não envia e-mail, SMS ou push notification externo — é um sistema in-app.
- Não cria alertas para outros tipos de evento além de vencimento de opções.
- Não permite configurar alertas por carteira ou por cliente individualmente.
- Não remove notificações após o assessor encerrar a posição (a notificação fica inativa naturalmente ao ser marcada como lida e o prazo de 24h passar).

---

## 5. Personas / Atores Envolvidos

| Ator | Papel |
|------|-------|
| Assessor | Receptor dos alertas; configura as preferências de notificação |
| Admin | Acesso idêntico ao do assessor para fins de suporte |
| Sistema | Gera os alertas automaticamente a partir de eventos internos |

---

## 6. Funcionalidades

### 6.1 Geração Automática de Alertas

O sistema verifica quais posições de opções abertas do assessor estão dentro da janela configurada e cria ou atualiza um alerta para cada uma. A geração nunca cria duplicatas — cada posição tem no máximo um alerta ativo por vez.

A varredura acontece de forma assíncrona (fire-and-forget) em resposta a 7 eventos do sistema, divididos em dois modos:

**Modo passivo** — respeita um throttle de 24 horas (não roda novamente se já rodou nas últimas 24 horas):
- Login do assessor
- Abertura do painel de métricas do dashboard

**Modo ativo** — ignora o throttle e executa imediatamente (dados mudaram):
- Compra de uma opção
- Venda de uma opção
- Fechamento de uma posição de opções
- Registro de vencimento de uma opção
- Atualização das configurações de notificação

### 6.2 Níveis de Severidade

A urgência de cada alerta é proporcional à janela configurada pelo assessor. Os thresholds são relativos ao total de dias da janela:

| Severidade | Condição | Cor na UI |
|------------|----------|-----------|
| **CRÍTICO** | Opção vencida ou dentro de 20% da janela | Vermelho |
| **ATENÇÃO** | Dentro de 50% da janela | Âmbar |
| **INFORMATIVO** | Restante da janela | Azul |

Exemplo com janela de 7 dias: opção a 1 dia = CRÍTICO; a 2–3 dias = ATENÇÃO; a 4–7 dias = INFORMATIVO.

### 6.3 Escalação de Severidade

Se um alerta já foi lido pelo assessor mas a opção se aproximou mais do vencimento e mudou de nível de severidade, o alerta é automaticamente reaberto como não lido. Isso garante que o assessor seja notificado novamente quando a situação se tornar mais urgente.

### 6.4 Listagem de Alertas

O assessor acessa os alertas pelo sino no header. São exibidos:
- Todos os alertas **não lidos**
- Alertas **lidos nas últimas 24 horas**

O painel lista até 50 notificações, ordenadas da mais recente à mais antiga. Cada item exibe: ticker da opção, quantidade, tipo (CALL/PUT), strike, direção (comprada/vendida), nome da carteira, nome do cliente e data de vencimento.

### 6.5 Marcação como Lida

O assessor pode marcar alertas individualmente ou todos de uma vez. Ao clicar em um alerta, ele é marcado como lido e o assessor é direcionado para a carteira correspondente.

### 6.6 Configurações

O assessor pode ajustar duas configurações:

- **Ativar/desativar notificações** — quando desativado, nenhum alerta é criado (não apenas ocultado da UI).
- **Janela de antecedência** — número de dias antes do vencimento em que os alertas começam a aparecer (mínimo 1 dia, máximo 30 dias, padrão 7 dias).

Ao salvar as configurações, o sistema imediatamente reprocessa todos os alertas com os novos parâmetros.

---

## 7. Regras de Negócio

| Código | Regra |
|--------|-------|
| BR-NOTIF-01 | Disparos passivos (login, dashboard) respeitam um throttle de 24 horas — não executam se já rodaram nesse período. |
| BR-NOTIF-02 | A severidade é proporcional à janela: abaixo de 20% da janela = CRÍTICO; abaixo de 50% = ATENÇÃO; demais = INFORMATIVO. |
| BR-NOTIF-03 | Se a severidade de um alerta lido aumentar, o alerta é reaberto automaticamente como não lido. |
| BR-NOTIF-04 | Uma posição jamais gera mais de um alerta simultâneo — deduplicação por posição e assessor. |
| BR-NOTIF-05 | Opções já vencidas (data de vencimento no passado) entram como CRÍTICO com mensagem "está VENCIDA". |
| BR-NOTIF-06 | A listagem de alertas inclui não lidos + lidos nas últimas 24 horas, com limite de 50 itens. |
| BR-NOTIF-07 | Se notificações estiverem desabilitadas, o sistema não cria novos alertas — a desativação é bloqueante, não apenas visual. |
| BR-NOTIF-08 | Ao atualizar configurações, o throttle de 24 horas é zerado e o reprocessamento acontece imediatamente. |
| BR-NOTIF-09 | O sistema verifica posições de todas as carteiras de todos os clientes do assessor — não apenas carteiras ativas. |

---

## 8. Fluxos Principais

### 8.1 Geração de Alertas (fluxo completo)

1. Um evento do sistema dispara a geração (ex: assessor faz login).
2. O sistema verifica se o assessor tem notificações habilitadas.
3. Se modo passivo, verifica se já rodou nas últimas 24 horas. Se sim, encerra.
4. Calcula o horizonte de vencimento: hoje + janela configurada.
5. Busca todas as carteiras dos clientes do assessor.
6. Dentro dessas carteiras, busca todas as posições de opções abertas com vencimento até o horizonte calculado (incluindo vencidas).
7. Para cada posição, calcula a severidade e a mensagem do alerta.
8. Faz um upsert: se o alerta já existe, atualiza severidade e mensagem; se houve escalação, reabre. Se não existe, cria.
9. Registra o timestamp da última execução.

### 8.2 Assessor Consulta Alertas

1. Assessor clica no sino no header.
2. O painel abre e exibe alertas não lidos + lidos nas últimas 24 horas.
3. Assessor clica em um alerta → marcado como lido e redirecionado para a carteira.
4. Ou clica em "Marcar todas como lidas" → todos os alertas não lidos são marcados.

### 8.3 Assessor Configura Notificações

1. Assessor navega para Configurações de Notificações.
2. Ajusta o toggle de ativação ou o slider de janela de antecedência.
3. Salva → configurações são aplicadas imediatamente e o sistema reprocessa todos os alertas com os novos parâmetros.

### 8.4 Escalação Automática de Severidade

1. Assessor leu um alerta INFO de uma opção a 6 dias do vencimento.
2. Na próxima varredura (ex: login 2 dias depois), a opção está a 4 dias → ainda INFO, sem mudança.
3. Uma semana se passa. Na próxima varredura, opção está a 1 dia → CRÍTICO.
4. Sistema detecta que a severidade aumentou. Marca o alerta como não lido novamente.
5. Badge volta a aparecer no header com o alerta reaberto.

---

## 9. Entidades e Relacionamentos

### Notificação

Representa um alerta gerado para uma posição de opção específica de um assessor.

| Atributo | Descrição |
|----------|-----------|
| Tipo | Atualmente apenas `OPTION_EXPIRY` — vencimento de opção |
| Severidade | INFO, WARNING ou CRITICAL — calculada dinamicamente |
| Entidade relacionada | ID da posição de opção monitorada |
| Carteira | ID da carteira onde a posição está (para navegação) |
| Lida | Flag que controla visibilidade no painel |

**Restrição:** Um assessor tem no máximo um alerta por combinação de tipo + posição. Novos eventos atualizam o alerta existente, não criam um novo.

### Configurações no Assessor (User)

As preferências de notificação são armazenadas diretamente no registro do usuário:

| Atributo | Descrição |
|----------|-----------|
| `notificationsEnabled` | Liga/desliga o sistema globalmente (padrão: ativo) |
| `notificationWindowDays` | Dias de antecedência (padrão: 7, range: 1–30) |
| `lastNotificationCheckAt` | Timestamp da última varredura (usado pelo throttle de 24h) |

---

## 10. Integrações com Outros Módulos

| Módulo | Tipo de integração | Descrição |
|--------|--------------------|-----------|
| **Auth** | Consumidor (disparo) | O login do assessor dispara uma varredura passiva |
| **Analytics** | Consumidor (disparo) | A abertura das métricas do dashboard dispara uma varredura passiva |
| **Derivatives** | Consumidor (disparo) | Compra, venda ou fechamento de opção dispara varredura com reprocessamento imediato |
| **Wallets** | Consumidor (disparo) | Registro de vencimento de opção dispara varredura com reprocessamento imediato |
| **Analytics** | Fornecedor (dados) | O widget "Ações Pendentes" lê notificações OPTION_EXPIRY não lidas para exibição no painel analítico |

---

## 11. Dependências Externas

Nenhuma. O módulo opera exclusivamente com dados internos do banco de dados — posições, carteiras e configurações do assessor. Não consulta APIs externas.

---

## 12. Considerações e Limitações Conhecidas

- **Sem notificações externas:** O sistema é 100% in-app. Não há integração com e-mail, push notification ou qualquer canal externo.
- **Atualização por polling:** O frontend atualiza a contagem de não lidas a cada 60 segundos via polling — não há WebSocket ou SSE para atualização em tempo real.
- **Granularidade fixa:** Não é possível configurar alertas por cliente específico, por carteira ou por tipo de opção. A janela de antecedência se aplica uniformemente a todas as posições.
- **Tipo único:** O sistema foi projetado para expansão (campo `type` existe no modelo), mas atualmente suporta apenas alertas de vencimento de opção.
- **Posições zeradas excluídas:** Posições com quantidade zero não geram alertas, mesmo que ainda existam no banco.
