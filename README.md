# Saúde Unificada

[![CI](https://github.com/GustavoSilvadeCarvalho/saude-unificada-web/actions/workflows/ci.yml/badge.svg)](https://github.com/GustavoSilvadeCarvalho/saude-unificada-web/actions/workflows/ci.yml)

Plataforma de **prontuário unificado de saúde**, integrada pelo CPF do paciente.
Projeto Integrador do curso de Desenvolvimento de Software Multiplataforma (DSM).

## Estrutura do repositório

| Pasta | Conteúdo | Stack |
|---|---|---|
| [`frontend/`](frontend) | Site institucional + área do médico e do gestor | React, Vite, TypeScript, Tailwind |
| [`backend/`](backend) | API usada pelo site e pelo app | NestJS, MongoDB (Mongoose), JWT |
| [`mobile/`](mobile) | App dos pacientes | React Native |
| [`docs/`](docs) | Contrato da API e documentação | — |

O contrato entre front, app e API está em [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

## Como rodar

Cada parte tem seu próprio `package.json`; entre na pasta antes de rodar os comandos.

```bash
cd frontend && npm install && npm run dev
```

```bash
cd backend && npm install && npm run dev
```

Veja o README de cada pasta para detalhes.

### API sem instalar nada além do Node

```bash
cd backend && npm install && npm run dev:memory
```

Sobe a API com um MongoDB em memória e os dados de teste. Swagger em http://localhost:3000/api/docs.

### Com Docker (API + MongoDB)

Precisa só do [Docker](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up -d --build                             # sobe a API e o MongoDB (replica set)
docker compose run --rm api node dist/database/seed.js   # dados de teste
node backend/scripts/smoke-test.mjs                      # confere se está tudo funcionando
docker compose down                                      # para (com -v apaga os dados)
```

- API: http://localhost:3000/api · Swagger: http://localhost:3000/api/docs
- MongoDB pelo computador (ex.: Compass): `mongodb://localhost:27017/saude-unificada?directConnection=true`
- Usuários de teste: `medico@teste.com`, `cardio@teste.com`, `gestor@teste.com` (senha `123456`); no app, CPF `22916926402` (senha `paciente123`).

## Testes e CI

```bash
cd backend
npm run test:e2e    # testes e2e e unitários
npm run test:cov    # com relatório de cobertura (backend/coverage/index.html)
```

O [GitHub Actions](.github/workflows/ci.yml) roda em todo push e pull request:

| Job | O que faz |
|---|---|
| API | typecheck, testes com cobertura mínima (90% das linhas) e relatórios (cobertura + JUnit) como artefato |
| Docker | monta a imagem, sobe API + MongoDB com `docker compose` e roda o teste de fumaça |
| Site | build do front-end |
