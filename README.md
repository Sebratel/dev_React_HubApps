# Sebratel Hub — Monorepo

Hub corporativo da Sebratel — frontend React 18 + backend Node.js/Express em monorepo.

## Estrutura do monorepo

```
dev_React_HubApps/
├── docker-compose.yml        # Stack única Portainer (hub-web + hub-api)
├── .env.portainer.example    # Variáveis consolidadas (frontend + backend)
├── Dockerfile                # Build do hub-web (frontend → Nginx)
├── hub-api/          # Backend Node.js/Express — API REST + Docker
│   ├── src/          # Rotas, middlewares, utilitários
│   ├── tests/        # Testes Jest
│   ├── sql/          # Migrations MySQL
│   ├── nginx/        # Config Nginx (reverse proxy + SSL)
│   └── Dockerfile
├── src/              # Frontend React 18 + TypeScript + Vite
├── test/             # Testes Vitest
├── public/
├── firebase.json     # Firebase Hosting
└── package.json
```

**Deploy:**
- **Portainer (stack única)** → `docker-compose.yml` (na **raiz**) sobe **hub-web + hub-api** juntos.
  Todas as variáveis (frontend `VITE_*` + backend) ficam num **único** arquivo na raiz:
  `.env` (modelo em [`.env.portainer.example`](.env.portainer.example)).
  No Portainer, aponte o compose para `./docker-compose.yml` e cole esse mesmo bloco em
  *Environment variables → Advanced mode*.
- **Alternativa frontend** → Firebase Hosting via `firebase deploy` (não usa o env do Portainer).

## Pré-requisitos

- Node.js 20+
- npm 10+

## Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Preencha os valores do projeto Firebase em .env.local
```

## Variáveis de ambiente

Copie `.env.example` e preencha os valores. Todas as variáveis são chaves **públicas** do Firebase
(identificadores de projeto, não segredos). Nunca adicione `VITE_JWT_SECRET`, `VITE_PRIVATE_KEY`,
ou credenciais de service account — veja ADR-0001-D7.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite HMR) |
| `npm run build` | Build de produção (tsc + vite build) |
| `npm run typecheck` | Verificação TypeScript sem emissão |
| `npm run lint` | ESLint com zero warnings |
| `npm run security:scan` | Verifica padrões proibidos no código-fonte |
| `npm run ci` | typecheck → lint → security:scan → build |

## Segurança (ADR-0001-D7)

O script `npm run security:scan` bloqueia:

- `JWT_SECRET`, `PRIVATE_KEY`, `client_secret` em qualquer arquivo fonte
- Chamadas `jwt.sign()` e `sign(` no frontend
- Identificador `generateToken` (use `requestAppLaunchToken`)
- `VITE_*SECRET` e `VITE_*PRIVATE` como prefixos de env
- Algoritmos HMAC (`HS256`, `HS384`, `HS512`) no cliente

## Decisões técnicas

Veja [`docs/adr/0001-react-migration-decisions.md`](../docs/adr/0001-react-migration-decisions.md).

## Estrutura

```
src/
├── app/               # (futuro) providers globais
├── components/        # Componentes reutilizáveis (UI + específicos)
│   └── ui/            # shadcn/ui base components
├── constants/         # config.ts — constantes de domínio
├── features/          # Módulos de feature (auth, dashboard, admin, …)
├── firebase/          # Inicialização Firebase + App Check
├── hooks/             # Hooks customizados
├── layouts/           # AuthLayout, DashboardLayout, AdminLayout
├── lib/               # utils.ts (cn)
├── providers/         # AuthProvider
├── router/            # createBrowserRouter + guards + ProtectedRoute + AdminRoute
├── services/          # auth, user, cloud-functions
├── stores/            # Zustand stores (auth — sem persist; apps — persist IDs only)
├── styles/            # globals.css (Tailwind + CSS vars Sebratel)
├── types/             # models.ts, enums.ts, permissions.ts
└── utils/             # permissions, firestore-date, email-domain, relative-time
```
