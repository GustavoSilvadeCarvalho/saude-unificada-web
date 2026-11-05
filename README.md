# Saúde Unificada

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
