# Clientes — Gestão de Carteira de Clientes e Sistema de Convites

## 1. Visão Geral

O módulo de Clientes permite que o assessor gerencie sua carteira de clientes e vincule essas entidades a usuários reais do sistema. Um cliente no Advision é um registro gerenciado pelo assessor — pode existir sem ter uma conta vinculada. O sistema de convites permite que um usuário com papel CLIENT aceite um convite e vincule seu login ao cadastro criado pelo assessor.

---

## 2. Problema que Resolve

Um assessor de investimentos precisa cadastrar e organizar seus clientes independentemente de esses clientes terem acesso ao sistema. Ao mesmo tempo, quando um cliente deseja visualizar suas próprias carteiras, ele precisa de uma forma segura de vincular sua conta ao cadastro que o assessor criou para ele, sem que o assessor precise gerenciar senhas ou criar contas em nome dos clientes.

---

## 3. Objetivos

- Permitir que o assessor cadastre, edite e remova clientes de sua carteira.
- Fornecer um sistema de convites para que clientes vinculem suas contas de forma autônoma e segura.
- Garantir que cada conta de cliente esteja vinculada a no máximo um cadastro, e vice-versa.
- Proteger os dados do assessor — cada assessor vê e gerencia apenas seus próprios clientes.

---

## 4. Escopo

**O que faz:**
- CRUD completo de clientes (criar, listar, editar, excluir).
- Geração e revogação de tokens de convite.
- Aceitação de convite pelo cliente (vinculação de conta).
- Consulta do status de convite de cada cliente.

**O que não faz:**
- Não cria contas de usuário em nome do cliente — o cliente cria a própria conta.
- Não permite desvincular uma conta já aceita (operação de desvinculação não existe).
- Não permite que um cliente tenha dois assessores simultaneamente.
- Não envia convites por e-mail ou SMS — o token é gerado e copiado manualmente pelo assessor.

---

## 5. Personas / Atores Envolvidos

| Ator | Papel |
|------|-------|
| Assessor | Cria e gerencia clientes; gera e revoga convites |
| Admin | Acesso idêntico ao assessor para fins de suporte |
| Cliente (usuário) | Aceita convite para vincular sua conta ao cadastro do assessor |

---

## 6. Funcionalidades

### 6.1 Cadastro de Clientes

O assessor cria um cliente informando nome e código. O código é um identificador numérico definido pelo assessor — único dentro da sua carteira, mas não globalmente. Dois assessores podem ter clientes com o mesmo código.

Ao excluir um cliente, todas as carteiras, posições e transações associadas são removidas em cascata. A conta de usuário vinculada (se houver) não é excluída — apenas o vínculo é desfeito.

### 6.2 Edição de Clientes

O assessor pode alterar o nome e o código de um cliente a qualquer momento, independentemente do status do convite.

### 6.3 Listagem de Clientes

O assessor vê apenas seus próprios clientes. A lista pode ser filtrada por texto (nome ou código) e por status de convite. Cada item exibe nome, código, status do convite e data de cadastro.

### 6.4 Sistema de Convites — Geração

O assessor gera um token de convite para um cliente. O token tem validade de 7 dias e só pode ser gerado se o cliente ainda não tiver uma conta vinculada.

Formato do token: `INV-` seguido de 8 caracteres alfanuméricos maiúsculos, sem caracteres ambíguos (sem `0`, `O`, `1`, `I`, `L`). Exemplo: `INV-ABC23DEF`.

O assessor copia o token manualmente e o compartilha com o cliente por qualquer canal (WhatsApp, e-mail, ligação). O sistema não envia o convite automaticamente.

### 6.5 Sistema de Convites — Aceitação

O cliente (já com conta criada no sistema, com papel CLIENT) navega para sua página inicial e encontra o formulário de vinculação. Ele insere o token recebido do assessor. O sistema valida o token, e se válido, vincula a conta do cliente ao cadastro do assessor.

Após a aceitação:
- O token é removido do banco (não pode ser reutilizado).
- O status muda para `ACCEPTED`.
- O cliente passa a enxergar suas carteiras no sistema.

### 6.6 Sistema de Convites — Revogação

O assessor pode revogar um convite enviado enquanto ele ainda não foi aceito. Após a revogação, o token é invalidado e o status volta a `PENDING`. O assessor pode então gerar um novo convite.

Não é possível revogar um convite já aceito.

---

## 7. Regras de Negócio

| Código | Regra |
|--------|-------|
| BR-CLI-01 | O código do cliente (`clientCode`) é único por assessor — dois clientes do mesmo assessor não podem ter o mesmo código. Assessores diferentes podem ter clientes com o mesmo código. Unicidade garantida por lógica de aplicação (`findFirst` antes do `create`), não por constraint de banco de dados. |
| BR-CLI-02 | O token de convite tem validade de 7 dias a partir da geração. Após esse prazo, o token é inválido e um novo precisa ser gerado. |
| BR-CLI-03 | O charset do token exclui caracteres visualmente ambíguos: sem `0` (zero), `O` (letra O), `1` (um), `I` (letra I), `L` (letra L). Apenas maiúsculas e dígitos 2–9. |
| BR-CLI-04 | Se houver colisão no token gerado (outro cliente já tem o mesmo token), o sistema tenta novamente até 5 vezes antes de falhar. |
| BR-CLI-05 | Um usuário pode estar vinculado a no máximo um cadastro de cliente. Tentar aceitar um segundo convite com a mesma conta é rejeitado. |
| BR-CLI-06 | Ao excluir um cliente, todas as suas carteiras, posições e transações são removidas em cascata. A conta do usuário vinculado é mantida, mas o vínculo é desfeito. |
| BR-CLI-07 | O status `REJECTED` existe no modelo de dados mas nunca é atribuído pelo sistema. A revogação retorna o status para `PENDING`, não para `REJECTED`. |
| BR-CLI-08 | Não existe operação de desvinculação — uma vez aceito o convite, o vínculo só pode ser desfeito por deleção do cliente. |
| BR-CLI-09 | O token não aparece nas respostas de listagem de clientes — apenas no endpoint específico de consulta de convite. |

---

## 8. Fluxos Principais

### 8.1 Assessor Cria e Convida um Cliente

1. Assessor acessa a página de Clientes e cria um novo cadastro com nome e código.
2. Abre os detalhes do cliente e clica em "Gerar convite".
3. Sistema gera o token `INV-XXXXXXXX` com validade de 7 dias.
4. Assessor copia o token e compartilha com o cliente pelo canal de preferência.

### 8.2 Cliente Vincula Sua Conta

1. Cliente cria sua conta no Advision com papel CLIENT (via página de registro).
2. Na página inicial, encontra o formulário de vinculação.
3. Insere o token recebido do assessor.
4. Sistema valida: token existe, status é SENT, não expirou, usuário ainda não está vinculado.
5. Vínculo é criado atomicamente. Token é removido. Status muda para ACCEPTED.
6. Cliente passa a visualizar suas carteiras.

### 8.3 Assessor Revoga e Regera Convite

1. Assessor percebe que enviou o token para o canal errado, ou o cliente perdeu o token.
2. Acessa os detalhes do cliente e clica em "Revogar convite".
3. Token é removido. Status volta para PENDING.
4. Assessor gera um novo token e compartilha novamente.

### 8.4 Assessor Remove um Cliente

1. Assessor clica em excluir e confirma.
2. Sistema remove em cascata: cliente → carteiras → posições → transações.
3. Se o cliente tinha uma conta vinculada, a conta do usuário é mantida, mas o campo de vínculo é limpo.

---

## 9. Entidades e Relacionamentos

### Cliente (Client)

Representa um cliente gerenciado por um assessor. Pode ou não ter uma conta vinculada.

| Atributo | Descrição |
|----------|-----------|
| name | Nome ou apelido do cliente |
| clientCode | Código numérico definido pelo assessor (único por assessor) |
| inviteStatus | Estado atual do convite: PENDING, SENT, ACCEPTED, REJECTED |
| inviteExpiresAt | Data de expiração do token (definida ao gerar o convite) |
| userId | ID do usuário vinculado (nulo até o aceite do convite) |

**Status do convite:**

| Status | Significado |
|--------|-------------|
| PENDING | Nenhum convite ativo. Estado inicial ou após revogação. |
| SENT | Convite gerado e aguardando aceite. Token ativo. |
| ACCEPTED | Cliente vinculou sua conta com sucesso. |
| REJECTED | Reservado — nunca atribuído pelo sistema atual. |

**Relacionamentos:**
- Um assessor (User) tem muitos Clients.
- Um Client pode ter uma carteira (`Wallet`) ou muitas.
- Um Client pode estar vinculado a um usuário (User com role CLIENT), relação 1:1.

---

## 10. Integrações com Outros Módulos

| Módulo | Tipo | Descrição |
|--------|------|-----------|
| **Auth** | Dependência | A aceitação do convite requer que o cliente esteja autenticado (JWT válido com role CLIENT) |
| **Wallets** | Dependência | Ao excluir um cliente, todas as suas carteiras são removidas em cascata |
| **Analytics** | Dependência | Widgets de analytics usam dados de clientes para calcular métricas consolidadas |

---

## 11. Dependências Externas

Nenhuma. O módulo opera exclusivamente com dados internos — sem envio de e-mail, SMS ou qualquer serviço externo.

---

## 12. Considerações e Limitações Conhecidas

- **Sem envio automático de convite:** O assessor precisa copiar e compartilhar o token manualmente. Não há integração com e-mail ou qualquer canal de comunicação.
- **Sem desvinculação:** Uma vez que um cliente aceita o convite, a única forma de desfazer o vínculo é excluir o cadastro do cliente — o que remove todas as suas carteiras em cascata.
- **Sem expiração de convite aceito:** O status `ACCEPTED` não tem prazo — a vinculação é permanente até deleção.
- **Validação de código apenas estrutural:** O `clientCode` é validado apenas como string numérica — o sistema não impõe nenhuma semântica de negócio sobre o valor do código.
