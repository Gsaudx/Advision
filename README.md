# TCC Investimentos - SaaS B2B para Assessores

Plataforma de gestão de portfólio e otimização de investimentos.
Projeto de TCC + Iniciação Científica (Algoritmo da Mochila).

##  Arquitetura e Padrões

### Backend: Monolito Modular (NestJS)
Não usamos arquitetura de camadas tradicional (Controller/Service/Repo) na raiz.
Agrupamos por **Domínio de Negócio**.

- **Módulos:** Cada pasta em modules/ é um domínio isolado (ex: optimization, wallet).
- **Comunicação:** Módulos podem importar uns aos outros via imports: [] no Module.
- **Banco de Dados:** Prisma ORM como fonte da verdade.

### Frontend: Feature-Based (React)
Não aglomeramos componentes em uma pasta gigante.
Usamos **Colocation**: O código vive perto de onde é usado.

- **Features:** Cada pasta em features/ contém tudo que uma funcionalidade precisa (api, componentes, rotas).
- **Shared:** Apenas componentes genéricos (UI Kit) ficam em components/ui.

##  Estrutura de Pastas

### Backend (/backend/src)
```
common/              # Decorators, Guards, Filters globais
config/              # Validação de variáveis de ambiente (Zod)
modules/             # <--- SEU CÓDIGO VIVE AQUI
   optimization/
       dto/          # Contratos de entrada/saída
       entities/     # Regras de negócio puras
       ...controller/service
    wallet/
 app.module.ts
```

### Frontend (/frontend/src)
```
 components/ui/       # ShadcnUI e Design System
 features/            # <--- SEU CÓDIGO VIVE AQUI
    optimization/
       api/           # React Query hooks (useOtimizacao)
       components/    # Tabelas/Gráficos específicos
       routes/        # Rotas internas da feature
 lib/                 # Configurações (Axios, QueryClient)
 pages/               # Montagem das páginas (Roteamento)
```

##  Guia de Desenvolvimento

### Criando uma Nova Funcionalidade (Ex: Relatórios)

1. **Backend:**
   - Crie modules/reports/reports.module.ts.
   - Defina o DTO de entrada (create-report.dto.ts) com class-validator.
   - Implemente a lógica no Service e exponha no Controller.
   - **Regra:** Sempre use injeção de dependência.

2. **Frontend:**
   - Crie features/reports/.
   - Crie o hook de API em features/reports/api/useReports.ts.
   - Crie a UI em features/reports/components/ReportChart.tsx.
   - Exporte a página principal em features/reports/index.ts e adicione ao Router.

##  Stack Tecnológica

- **Core:** NestJS, React, TypeScript.
- **Dados:** PostgreSQL, Prisma.
- **UI:** TailwindCSS, Shadcn/ui.
- **Infra:** AWS (EC2/RDS/S3/CloudFront), Docker.

##  Regras de Ouro

1. **Zero Over-engineering:** Se uma função resolve, não crie uma classe.
2. **Tipagem Estrita:** Sem any. Interfaces do Front espelham DTOs.
3. **Commits:** Siga o padrão Conventional Commits (feat, fix, chore).

##  Como Rodar Localmente

### Opção 1: Via Docker Compose (Recomendado para Simular Produção)
Este comando sobe o Banco, Backend e Frontend em containers.

`bash
docker-compose up --build -d
` 
- Frontend: http://localhost:80 
- Backend: http://localhost:3000 
- Banco: localhost:5432 

### Opção 2: Desenvolvimento Local (Hot Reload)

1. **Suba apenas o Banco de Dados:**
   `bash
   docker-compose up postgres -d
   ` 

2. **Backend (NestJS):**
   `bash
   cd backend
   npm install
   npx prisma generate
   npm run start:dev
   ` 

3. **Frontend (React + Vite):**
   `bash
   cd frontend
   npm install
   npm run dev
   ` 

##  CI/CD (GitHub Actions)

O projeto possui pipeline automatizada de deploy para AWS EC2.

**Secrets Necessárias no GitHub:**
- DOCKERHUB_USERNAME / DOCKERHUB_TOKEN: Credenciais Docker Hub.
- EC2_HOST: IP Público da instância.
- EC2_USER: Usuário SSH (ex: ec2-user).
- EC2_SSH_KEY: Conteúdo da chave privada .pem.
- DATABASE_URL: Connection string do RDS (Prod).