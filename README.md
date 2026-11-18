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
| [`infra/`](infra) | Infraestrutura na AWS como código | AWS CDK (TypeScript) |
| [`tests/`](tests) | Plano de testes, casos de segurança, roteiro de carga e relatórios de qualidade | — |
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

```bash
cd mobile && npm install && npm start
```

O app usa React Native + **Expo (SDK 58)**: rode `npm start` na pasta `mobile`,
abra o Expo Go no celular (mesma rede Wi-Fi do PC) e escaneie o QR code. O
celular precisa acessar a API pelo IP do PC (ex.: `http://192.168.15.8:3000/api`
no `mobile/.env` — veja a tabela completa no README de `mobile/`). Para o backend
sem MongoDB instalado, use `npm run dev:memory`.

Veja o README de cada pasta para detalhes.

### Qual API o site e o app usam

A API está publicada na AWS em **https://d2jog01y159we3.cloudfront.net/api** (Swagger em [`/api/docs`](https://d2jog01y159we3.cloudfront.net/api/docs)), ligada desde 18/11/2026 para a gravação e o pitch. Cada parte tem um comando para cada caso, sem precisar editar o `.env`:

| Situação | Site (`frontend/`) | App (`mobile/`) |
|---|---|---|
| API da AWS no ar | `npm run dev:aws` | `npm run start:aws` |
| Só a API local ligada (`cd backend && npm run dev:memory`) | `npm run dev:local` | `npm run start:local` |
| Sem API nenhuma (dados fixos de `src/mocks`) | `npm run dev:mock` | — |

- O `start:local` do app descobre sozinho o IP do computador na rede (o celular não enxerga o `localhost` do PC) e avisa se a API não responder. Celular e PC precisam estar no mesmo Wi-Fi.
- O site precisa rodar em `http://localhost:5173`: é a única origem liberada no CORS da API.
- Se a API da AWS for derrubada e subida de novo, o endereço do CloudFront muda. Atualize em `frontend/.env.api-aws` e em `mobile/scripts/start.mjs`.

### API sem instalar nada além do Node

```bash
cd backend && npm install && npm run dev:memory
```

Sobe a API com um MongoDB em memória e os dados de teste. Swagger em http://localhost:3000/api/docs.

### Site + API com os dados inventados (para testar tudo junto)

Terminal 1, a API em memória (o seed roda sozinho e volta ao estado inicial a cada reinício):

```bash
cd backend && npm install && npm run dev:memory
```

Terminal 2, o site apontando para ela:

```bash
cd frontend && npm install && npm run dev:local
```

Abra http://localhost:5173/login: a tela mostra os usuários de teste com um botão **Preencher**. Sem o `.env`, o site usa os dados fixos de `frontend/src/mocks` e não precisa da API.

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
- Usuários de teste (senha `123456`): médicos `medico@teste.com` (clínica médica), `cardio@teste.com` (cardiologia), `pediatra@teste.com`, `gineco@teste.com` e `orto@teste.com`; gestores `gestor@teste.com` e `gestor2@teste.com`.
- No app (senha `paciente123`): CPFs `22916926402` (Maria), `27952204408` (João), `89313074893` (Sofia, gestante), `52525738080` (Roberto) e `55991928819` (Camila). São 18 pacientes e 34 atendimentos inventados, com receitas e laudos de demonstração.

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
| Infra | typecheck, testes das regras da infraestrutura AWS e `cdk synth` |
| Site | build do front-end |

Plano de testes, casos de segurança (OWASP Top 10), roteiro de carga e relatórios com as evidências de cada rodada: [`tests/`](tests).

## Nuvem (AWS)

API em **ECS Fargate** com auto scaling (1 a 3 tarefas), atrás de **CloudFront + Application Load Balancer**, documentos no **S3**, dados no **MongoDB Atlas** e monitoramento no **CloudWatch** (dashboard e alarmes por e-mail), na região us-east-1, pensado para gastar o mínimo: a parte que cobra por hora só fica ligada nos testes e na apresentação.

Arquitetura, custos, passo a passo do deploy e como demonstrar o auto scaling: [`docs/infraestrutura.md`](docs/infraestrutura.md).
