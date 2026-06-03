# Autenticação — Identidade, Acesso e Proteção de Rotas

## 1. Visão Geral

O módulo de Autenticação controla quem pode acessar o sistema e o que cada usuário pode fazer. Ele gerencia o registro de novas contas, o processo de login, a sessão do usuário e a proteção de rotas por papel (role). Toda a comunicação de identidade entre frontend e backend ocorre via cookie seguro, sem expor tokens ao JavaScript da página.

---

## 2. Problema que Resolve

Aplicações multi-tenant com papéis distintos (assessor, cliente, admin) precisam garantir que cada usuário acesse apenas o que lhe é permitido, e que a sessão seja mantida de forma segura entre requisições. Soluções baseadas em tokens armazenados no `localStorage` são vulneráveis a ataques XSS. O sistema precisava de uma solução que fosse segura por padrão, sem exigir gerenciamento manual de tokens pelo frontend.

---

## 3. Objetivos

- Permitir que novos assessores e clientes se registrem de forma autônoma.
- Autenticar usuários via email e senha com verificação segura.
- Manter sessão via cookie HttpOnly, protegendo contra XSS.
- Restringir o acesso a rotas e endpoints com base no papel do usuário.
- Garantir que usuários ADMIN só possam ser criados manualmente — nunca via auto-registro.

---

## 4. Escopo

**O que faz:**
- Registro de contas com papéis ADVISOR ou CLIENT.
- Login com verificação de senha e emissão de sessão via cookie.
- Logout por limpeza de cookie.
- Consulta do perfil do usuário autenticado.
- Proteção de endpoints e rotas por papel.

**O que não faz:**
- Não oferece recuperação de senha ou redefinição por e-mail.
- Não implementa autenticação multi-fator (MFA).
- Não revoga tokens JWT no servidor — o logout é puramente client-side.
- Não permite que usuários alterem seu papel após o registro.
- Não suporta login via redes sociais (OAuth externo).

---

## 5. Personas / Atores Envolvidos

| Ator | Papel |
|------|-------|
| Assessor | Cria conta, faz login, acessa rotas de gestão de clientes e carteiras |
| Cliente | Cria conta, faz login, acessa suas próprias carteiras e dashboard |
| Admin | Acesso irrestrito; conta criada manualmente (nunca via auto-registro) |
| Sistema | Valida e renova tokens; protege endpoints via guards |

---

## 6. Funcionalidades

### 6.1 Registro de Conta

Qualquer pessoa pode criar uma conta como assessor ou cliente. O formulário de registro coleta: nome, email, senha, papel (ADVISOR ou CLIENT), CPF/CNPJ e telefone (ambos opcionais).

O sistema valida os dados, verifica se o email já existe, e cria a conta com a senha armazenada como hash seguro. Ao final, emite automaticamente uma sessão — o usuário já fica logado após o registro.

Regras do registro:
- O papel ADMIN não pode ser selecionado — é rejeitado tanto no frontend quanto no backend.
- O email deve ser único no sistema.
- A senha deve ter entre 8 e 100 caracteres.
- CPF (11 dígitos) e CNPJ (14 dígitos) são validados se fornecidos, armazenados sem máscara.
- Telefone segue formato internacional (`+DDI + número`).

### 6.2 Login

O usuário entra com email e senha. O sistema verifica as credenciais, e em caso de sucesso emite um cookie de sessão seguro. O usuário é então redirecionado para o dashboard correspondente ao seu papel.

Após um login bem-sucedido de assessor ou admin, o sistema dispara automaticamente (em background) a verificação de notificações de vencimento de opções.

### 6.3 Sessão via Cookie HttpOnly

A sessão é mantida por um cookie com as seguintes características:

| Atributo | Valor |
|----------|-------|
| Nome | `advision_auth` |
| HttpOnly | Sim — inacessível via JavaScript |
| SameSite | Strict — não enviado em requisições cross-site |
| Secure | Sim em produção — apenas sobre HTTPS |
| Duração | Configurável (padrão: 12 horas) |

O token dentro do cookie é um JWT assinado com o segredo da aplicação. O payload contém o ID, email e papel do usuário.

### 6.4 Logout

O logout limpa o cookie do navegador. Como o sistema é stateless, não há revogação do token no servidor — a proteção depende da expiração automática do JWT e das propriedades do cookie (HttpOnly + SameSite).

### 6.5 Consulta de Perfil

Um endpoint protegido retorna os dados do usuário autenticado: ID, nome, email, papel, CPF/CNPJ, telefone, data de criação e, se o usuário for um cliente, o ID do seu perfil de cliente vinculado.

### 6.6 Proteção de Rotas por Papel

No backend, cada endpoint é protegido por dois guards aplicados em conjunto:
- **JwtAuthGuard**: verifica se o cookie contém um JWT válido e não expirado.
- **RolesGuard**: verifica se o papel do usuário autenticado está na lista de papéis permitidos para aquele endpoint.

No frontend, o `ProtectedLayout` aplica a mesma lógica antes de renderizar qualquer página protegida. Usuários não autenticados são redirecionados para `/login`. Usuários autenticados com papel incorreto são redirecionados para o dashboard do seu próprio papel.

---

## 7. Regras de Negócio

| Código | Regra |
|--------|-------|
| BR-AUTH-01 | O papel padrão ao registrar é ADVISOR, se nenhum papel for especificado. |
| BR-AUTH-02 | O papel ADMIN não pode ser selecionado no auto-registro. Contas ADMIN são criadas manualmente. |
| BR-AUTH-03 | O token de sessão trafega exclusivamente via cookie HttpOnly — nunca no corpo da resposta. |
| BR-AUTH-04 | O cookie é marcado como `httpOnly=true`, `sameSite=strict` e `secure` em produção. |
| BR-AUTH-05 | A duração da sessão é configurável via variável de ambiente `JWT_EXPIRES_IN` (padrão: 12h). Formato aceito: número seguido de s, m, h ou d. |
| BR-AUTH-06 | Após login de assessor ou admin, o sistema verifica notificações de vencimento de opções em background (fire-and-forget, respeitando throttle de 24h). |
| BR-AUTH-07 | O logout é stateless — limpa apenas o cookie do cliente, sem invalidar o token no servidor. |
| BR-AUTH-08 | Senhas são armazenadas como hash bcrypt com 10 rounds de salt — o valor original nunca é persistido. |

---

## 8. Fluxos Principais

### 8.1 Registro de Nova Conta

1. Usuário preenche o formulário (nome, email, senha, papel, CPF/CNPJ, telefone).
2. Frontend valida os campos localmente (tamanhos, formato de email, senhas conferem).
3. Requisição é enviada ao backend.
4. Backend valida os dados com Zod e rejeita se o papel for ADMIN.
5. Sistema verifica se o email já existe. Se sim, retorna erro 409.
6. Senha é transformada em hash bcrypt.
7. Usuário é criado no banco.
8. JWT é gerado e emitido via cookie HttpOnly.
9. Frontend recebe o perfil do usuário e redireciona para o dashboard do papel.

### 8.2 Login

1. Usuário informa email e senha.
2. Backend valida formato dos campos.
3. Sistema busca o usuário pelo email. Se não encontrar, retorna erro 401.
4. Senha informada é comparada com o hash armazenado. Se incorreta, retorna erro 401.
5. JWT é gerado com o ID, email e papel do usuário.
6. Cookie HttpOnly é emitido com o token.
7. Notificações de vencimento são verificadas em background (se ADVISOR ou ADMIN).
8. Frontend recebe o perfil e redireciona para o dashboard.

### 8.3 Proteção de Acesso

1. Frontend envia requisição — o navegador inclui o cookie automaticamente.
2. Backend extrai o JWT do cookie e valida assinatura e expiração.
3. Se inválido ou ausente, retorna 401.
4. Se válido, verifica se o papel do usuário tem acesso ao endpoint.
5. Se sem permissão, retorna 403.
6. Se autorizado, processa a requisição.

---

## 9. Entidades e Relacionamentos

### Usuário (User)

Representa qualquer conta no sistema. Todos os papéis compartilham o mesmo modelo.

| Atributo | Descrição |
|----------|-----------|
| email | Identificador único de login |
| passwordHash | Hash bcrypt da senha — nunca a senha em texto |
| role | ADVISOR, CLIENT ou ADMIN |
| cpfCnpj | CPF ou CNPJ sem formatação (opcional) |
| phone | Telefone em formato internacional (opcional) |

**Relacionamentos:**
- Um assessor tem muitos `Client` (carteira de clientes gerenciados).
- Um cliente (USER com role CLIENT) pode ter um `Client` vinculado ao seu perfil via convite.
- Um usuário ADVISOR/ADMIN tem `Notification` (alertas de vencimento).

### Token de Sessão (JWT)

Não é uma entidade do banco — é um token stateless emitido e transportado pelo cookie.

| Campo | Conteúdo |
|-------|----------|
| `sub` | ID do usuário |
| `email` | Email do usuário |
| `role` | Papel do usuário |
| Expiração | Configurável (padrão 12h) |

---

## 10. Integrações com Outros Módulos

| Módulo | Tipo | Descrição |
|--------|------|-----------|
| **Notifications** | Consumidor | O login dispara verificação de notificações de vencimento (fire-and-forget) |
| **Clients** | Provedor de identidade | O sistema de convites usa o userId do usuário autenticado para vincular um client |
| **Todos os módulos** | Infraestrutura | JwtAuthGuard e RolesGuard são aplicados em todos os endpoints que exigem autenticação |

---

## 11. Dependências Externas

| Dependência | Uso |
|-------------|-----|
| bcrypt | Hash e verificação de senhas |
| @nestjs/passport + passport-local | Estratégia de validação de credenciais no login |
| @nestjs/jwt + passport-jwt | Emissão e verificação de tokens JWT |
| cookie-parser | Leitura de cookies nas requisições |

---

## 12. Considerações e Limitações Conhecidas

- **Sem revogação de token:** Se um cookie for comprometido antes de expirar, o token permanece válido até o fim de sua vida útil. Não há mecanismo de blacklist ou revogação server-side.
- **Sem recuperação de senha:** O sistema não oferece fluxo de "esqueci minha senha" — a redefinição precisaria ser feita manualmente.
- **Admin criado fora do sistema:** Não há interface para criar usuários ADMIN. Isso exige acesso direto ao banco de dados ou ao ambiente do servidor.
- **Sessão de duração fixa:** A sessão não é renovada automaticamente com uso — ao expirar, o usuário precisa fazer login novamente.
- **Validação de CPF/CNPJ apenas estrutural:** O sistema valida o número de dígitos (11 para CPF, 14 para CNPJ), mas não verifica a validade matemática (dígitos verificadores).
