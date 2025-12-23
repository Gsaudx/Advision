#  Sistema de Otimização de Carteiras de Investimento

Plataforma B2B para assessores de investimento focada em gestão de portfólio, monitoramento de derivativos e rebalanceamento inteligente de ativos.

Este projeto serve também como base experimental para a Iniciação Cientêfica: **"Otimização Combinatória no Rebalanceamento de Carteiras: Uma Abordagem via Problema da Mochila Inteira"**.

##  Tecnologias

O projeto utiliza uma arquitetura moderna, escalável e tipada:

- **Backend:** Node.js, NestJS, TypeScript, Prisma ORM.
- **Database:** PostgreSQL.
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Recharts.
- **DevOps:** Docker, Docker Compose, GitHub Actions.

##  Arquitetura

O sistema opera como um **Monolito Modular** no backend e uma **SPA (Single Page Application)** no frontend.
Destaque técnico: Módulo de Otimização (/optimization) que implementa o *Integer Knapsack Problem* para sugerir alocação de ativos minimizando o *cash drag* (sobra de caixa).

##  Como Rodar Localmente

### Opção 1: Via Docker Compose (Recomendado para Simular Produ��o)
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
- EC2_HOST: IP Público da inst�ncia.
- EC2_USER: Usuário SSH (ex: ec2-user).
- EC2_SSH_KEY: Conteúdo da chave privada .pem.
- DATABASE_URL: Connection string do RDS (Prod).

##  Estrutura do Projeto

- /backend: API NestJS, Regras de Negócio, Prisma ORM.
- /frontend: Interface React, Tailwind CSS, Dashboards.
- docker-compose.yml: Orquestração de containers (Full Stack).

