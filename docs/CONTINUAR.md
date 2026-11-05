# Continuar o projeto — Saúde Unificada

Arquivo de passagem de contexto entre sessões. Para continuar em outro PC, abra o Claude Code na raiz do repositório e diga:
**"leia o docs/CONTINUAR.md e siga do próximo bloco"**.

## Documentos de referência (nesta pasta)

| Arquivo | Conteúdo |
|---|---|
| [`manual-pi6.pdf`](manual-pi6.pdf) | **Manual oficial do PI 6, que define o que vale nota.** Ver o resumo abaixo |
| [`sprint-1-planejamento.pdf`](sprint-1-planejamento.pdf) | Problema, público-alvo, requisitos, escopo, equipe e cronograma das sprints |
| [`estrutura-base-requisitos.pdf`](estrutura-base-requisitos.pdf) | Requisitos detalhados: cadastro por CPF, site, app e o que cada perfil acessa na API |
| [`API_CONTRACT.md`](API_CONTRACT.md) | **Contrato da API: a especificação das rotas que o site já usa** |

## Contexto do projeto

- PI do 6º semestre DSM. Grupo: Arthur Davi Gomes, Gustavo Silva de Carvalho, Raul Tenorio, Matheus Henrique Vieira Neves.
- Plataforma de prontuário unificado por CPF:
  - **site** para médicos e gestores públicos;
  - **app mobile** para pacientes;
  - **API** compartilhada pelos dois.
- Matheus é o responsável pela **API** e também vai ajudar no **app mobile**.
- Repositório (monorepo): https://github.com/GustavoSilvadeCarvalho/saude-unificada-web
  - `frontend/`: site em React, Vite e TS. Feito pelo Gustavo e funcionando com mocks.
  - `backend/`: API em NestJS com MongoDB (em construção).
  - `mobile/`: app em React Native (não iniciado).
  - `docs/`: contrato, PDFs do PI e este arquivo.
- Tipos equivalentes ao contrato: `frontend/src/types/index.ts`. Chamadas do front: `frontend/src/services/api.ts`.
- Os mocks do front (`frontend/src/mocks/`) mostram o comportamento esperado de cada rota (ex.: `mockCreateAppointment` em `services/api.ts`).
- **Prazo:** entrega final em **19/11/2026**, com pitch na semana seguinte. O tempo é curto, então priorizar o que vale nota.

## O que o manual cobra (e onde entra no plano)

| Disciplina | Cobra | Como atendemos |
|---|---|---|
| Lab. Desenvolvimento Multiplataforma (principal) | Sistema funcional, integração entre plataformas, README profissional | Blocos 5–10, integração site↔API e app↔API, READMEs (bloco 14) |
| Computação em Nuvem II | Infra em nuvem configurada, serviços escaláveis, monitoramento básico; configurações/scripts de infra no GitHub | **AWS** (o professor ensina a montar a nuvem e a escolha é do grupo): Docker, ECS Fargate, ALB com auto scaling, S3, CloudWatch, infra como código em `infra/` (blocos 11–12) |
| Qualidade e Teste de Software | Plano de testes, testes funcionais e não funcionais, relatórios; **pasta `/tests`** com relatórios e evidências | Testes escritos **junto com cada bloco**, CI no GitHub Actions, cobertura, carga com k6, testes de segurança, relatórios em `tests/` (blocos 11 e 13) |

Fases do manual: 1 Planejamento → 2 Implementação → 3 Nuvem → 4 Testes → 5 Otimização e escalabilidade (**evidências de escalabilidade**: teste de carga antes/depois, auto scaling) → 6 Produto final + pitch.

## Como o Matheus quer trabalhar

- **Blocos pequenos.** Ao fim de cada bloco:
  1. compilar (`npm run typecheck`);
  2. rodar os testes;
  3. parar e passar os comandos `git add <arquivos> && git commit -m "..."`.
- **Quem commita é o Matheus**, não o Claude. O histórico de commits é a trilha de evolução do projeto.
- **Vários commits pequenos por bloco** (um por parte: seed, rota, Swagger, testes...), não um commitzão.
- Mensagens de commit em português: `feat(backend): ...`, `test(backend): ...`, `chore(infra): ...`, `docs: ...`.
- Branch de trabalho: `feat/backend-api`.
- Pasta local do Matheus: `C:\Users\nepri\Documents\Projeto PI\saude-unificada-web` (o Claude escreve os arquivos ali pela pasta conectada no app desktop).
- O ambiente do Claude **não consegue baixar o MongoDB** (download bloqueado). Ele roda os testes contra o **FerretDB** (compatível com MongoDB, baixado do GitHub) usando `TEST_MONGODB_URI`, mas o FerretDB não tem transação: o que depender dela (bloco 7) só é validado de verdade quando o Matheus roda `npm run test:e2e` no Windows.
- Explicar em português e de forma direta.

## Decisões de infraestrutura e custo (definidas em 05/11)

**Orçamento: no máximo R$ 50 no projeto inteiro (≈ US$ 9). Tudo que puder ser gratuito, é gratuito.**

| O quê | Onde | Custo |
|---|---|---|
| Dados (usuários, pacientes, atendimentos, regiões) | **MongoDB Atlas, cluster Free (M0)**, região São Paulo | R$ 0 |
| Arquivos (PDF, JPG, PNG de receitas e laudos) | **AWS S3**, bucket privado | centavos |
| API "no ar" durante a entrega | 1 instância pequena (EC2 com Docker) | ~US$ 5–8 |
| Teste de escalabilidade | ECS Fargate + ALB com auto scaling 1→3, **ligado só nas rodadas de teste** (~2 h) e destruído com `cdk destroy` | < US$ 1 |
| Monitoramento | CloudWatch (logs com retenção de 7 dias, 1 dashboard, poucos alarmes) | ~R$ 0 |
| Site | Vercel | R$ 0 |
| Plano C | VMs com **OpenStack**, só na reta final e se a AWS não der certo | — |

- **Conta AWS nova no plano Free:** contas criadas depois de 15/07/2025 ganham US$ 100 em créditos (até US$ 200 com as atividades de onboarding) e, no plano Free, nada é cobrado no cartão; a conta fecha sozinha em 6 meses. Conferir se ECS/ALB estão liberados no plano Free; se não, usar EC2 + Auto Scaling Group.
- **Região sa-east-1 (São Paulo)** para API, S3 e Atlas: argumento de LGPD (dados de saúde no Brasil) e menor latência na demo.
- **Sem NAT Gateway** (é a armadilha de custo clássica): tarefas em subnet pública.
- **Alerta de orçamento (AWS Budgets)** em US$ 3 e US$ 8 no primeiro dia.
- **Limites do Atlas Free:** 512 MB, 100 operações/s, 500 conexões. O teste de carga mira principalmente o **login** (bcrypt gasta CPU e faz 1 leitura no banco): a CPU da API sobe e dispara o auto scaling sem estourar o limite do Atlas.

## Swagger (documentação viva da API)

- Swagger UI em `/api/docs` e o JSON do OpenAPI em `/api/docs-json`. Liga/desliga com `SWAGGER_ENABLED` (padrão `true`, deixado ligado na demo).
- **Todo bloco documenta as próprias rotas:** `@ApiTags`, `@ApiOperation`, `@ApiProperty` nos DTOs, classes de resposta e os erros (`@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, ...), com exemplos iguais ao `API_CONTRACT.md`.
- `npm run openapi` gera `docs/openapi.json` (sem precisar de banco). Serve como evidência, para importar no Postman/Insomnia e como base dos testes de carga (k6).
- Na parte de Qualidade, o Swagger entra no plano de testes como ferramenta de **teste exploratório/manual** (com prints em `tests/relatorios/`), e há um teste e2e garantindo que todas as rotas aparecem documentadas.

## Estado atual (commitado na `feat/backend-api`)

Blocos 1–4 (setup, bootstrap, login), **bloco 5** (seed, `dev:memory`, health, Swagger, base de testes), **bloco 6** (pacientes e auditoria) **bloco 7** (atendimentos), **bloco 8** (documentos com S3), **bloco 9** (painel do gestor), **bloco 10** (paciente no app, login por CPF) e **bloco 11** (Docker e CI) prontos. Próximos: **bloco 12** (AWS) e o **app mobile**.

```
backend/
├─ package.json            "type": "module"; scripts dev, dev:memory, build, start, seed, openapi, typecheck, test:e2e, test:cov, test:ci
├─ Dockerfile              multi-stage (build → deps de produção → runtime node:24-slim, usuário node, HEALTHCHECK em /api/health/live)
├─ scripts/smoke-test.mjs  teste de fumaça contra uma API no ar (local, Docker, AWS): node backend/scripts/smoke-test.mjs <url>
├─ tsconfig.json           nodenext, decorators + emitDecoratorMetadata, strict
├─ tsconfig.build.json     rootDir ./src (o TS 6 exige rootDir explícito)
├─ vitest.config.e2e.ts    testes em test/**/*.e2e-spec.ts e *.spec.ts; cobertura v8 com mínimo de 90% linhas / 80% branches
├─ .env.example            PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGINS, UPLOAD_DIR, SWAGGER_ENABLED
├─ src/
│  ├─ main.ts              bootstrap (porta em PORT)
│  ├─ dev-memory.ts        MongoMemoryReplSet + seed + main (npm run dev:memory)
│  ├─ openapi.ts           gera docs/openapi.json sem banco (modo preview do Nest)
│  ├─ swagger.ts           setupSwagger / buildOpenApiDocument (UI em /api/docs, JSON em /api/docs-json)
│  ├─ app.setup.ts         configureApp(app): prefixo /api, CORS, ValidationPipe(whitelist, transform), filtro de erros, Swagger
│  ├─ app.module.ts        Config, Mongoose, Storage, Users, Auth, Health, Patients, Appointments, Regions, Me
│  ├─ common/
│  │  ├─ cpf.ts / cpf.pipe.ts      onlyDigits, isValidCpf, completeCpf / ParseCpfPipe (CPF da URL → dígitos, senão 400)
│  │  ├─ validators.ts     @IsCpf(), @IsDateOnly({ notFuture }), isDateOnly, todayDateOnly
│  │  ├─ regions.ts        REGIONS (lista inicial usada pelo seed; a fonte da verdade é a coleção regions)
│  │  ├─ schema-options.ts jsonSchemaOptions: toJSON troca _id→id e remove __v, passwordHash, storedName (usar em TODO schema e subschema)
│  │  ├─ roles.ts          USER_ROLES, @Roles(...), @Public(), AuthUser {id,name,role}
│  │  ├─ error-response.ts ErrorResponse (Swagger)
│  │  ├─ validation.ts     validationExceptionFactory: mensagens legíveis ("Alergia 2: ...") no ValidationPipe
│  │  ├─ password.ts       passwordProblem: regras da senha do paciente (8+, letras e números, sem CPF/nascimento, não comum)
│  │  ├─ uploads.ts        detectFileType (PDF/JPG/PNG pelo conteúdo), cleanFileName (acento/latin1), MAX_UPLOAD_BYTES
│  │  ├─ env.ts            loadEnvFile() para scripts fora do Nest
│  │  ├─ current-user.decorator.ts, transforms.ts (@EmptyToUndefined, @Trim, @Digits)
│  │  └─ http-exception.filter.ts   erro = { statusCode, message } em português; E11000 → 409
│  ├─ users/               schema User (email p/ medico e gestor, cpf p/ paciente; índices únicos sparse), UsersService
│  ├─ auth/                POST /auth/login (site), POST /auth/patient-login e /auth/patient-register (app, CPF), GET /auth/me; AuthGuard global (JWT + @Roles; paciente leva o CPF no token)
│  ├─ me/                  rotas do app do paciente: /me/record, /me/appointments, /me/exams, /me/access-log, download de documento próprio
│  ├─ health/              GET /health (API + MongoDB, 503 se o banco cair), GET /health/live (load balancer)
│  ├─ audit/               AuditLog (audit_logs: userId, userName, userRole, action, patientCpf, at); AuditService.record / findByPatient
│  ├─ patients/            schema com o prontuário embutido; GET /patients/:cpf (com appointmentSummaries) e POST /patients (só medico, auditados)
│  ├─ appointments/        schema (com documents[]), GET /appointments?doctorId|patientCpf, POST /appointments (transação: atendimento + prontuário + auditoria),
│  │                       POST /appointments/:id/documents (upload) e GET .../documents/:documentId/download (link de 5 min)
│  ├─ regions/             coleções regions e regional_stats; GET /regions (medico e gestor), GET /regional-data (gestor); RegionsService.exists valida o cadastro de paciente
│  ├─ storage/             StorageService (local | s3, por STORAGE_DRIVER), createStorage(env), GET /files/:token (links do driver local)
│  └─ database/            seed-data.ts (usuários, pacientes, atendimentos e documentos dos mocks), seed.ts (runSeed(connection, { storage })),
│                          regional-data.ts (mesmo gerador do mock do site), demo-pdf.ts, transaction.runner.ts
└─ test/                   helpers.ts (createTestApp, login, loginUser; uploads numa pasta temporária) + e2e de auth, health, patients, appointments, documents, regional, patient-app, swagger;
                           unitários: cpf.spec.ts, uploads.spec.ts, storage.spec.ts, password.spec.ts
```

- Usuários de teste: `medico@teste.com`, `cardio@teste.com`, `gestor@teste.com`, senha `123456`. App: Maria (`22916926402`) e João (`27952204408`), senha `paciente123`; Ana (`50717927296`, nascida em `1996-11-05`) sem conta, para demonstrar o primeiro acesso. Pacientes: os 6 dos mocks, com CPFs fictícios (`SEED_CPFS`; Maria = `22916926402`).
- Testes: `npm run test:e2e` usa um MongoDB em memória por arquivo. Com `TEST_MONGODB_URI` definida, usam esse servidor (um banco com nome único por arquivo, apagado no fim); o teste de "banco fora do ar" é pulado nesse modo.

## Convenções de código

- Sem ponto e vírgula, aspas simples, 2 espaços (mesmo estilo do frontend).
- ESM: **imports relativos terminam em `.js`** (ex.: `import { X } from './x.js'`).
- Comentários e mensagens de erro em português, terminando em ponto (ex.: `'Paciente não encontrado.'`).
- Respostas no formato do contrato:
  - campos em camelCase e em inglês;
  - `id` como string;
  - datas `AAAA-MM-DD` e data/hora em ISO;
  - CPF só com dígitos.
- `@Prop` de campo com tipo união (ex.: `role: UserRole`, `status: 'ativa' | ...`) precisa de `type: String` explícito: nos testes o Vitest não gera o tipo de uniões e o Mongoose quebra.
- **CPF:** validado só por regras, sem consulta externa (`cpfProblem` em `common/cpf.ts`): formato `22916926402` ou `229.169.264-02`, dígitos verificadores, 11 dígitos iguais recusados e CPFs de exemplo conhecidos (`12345678909`, `11144477735`...) recusados com mensagem própria. No DTO: `@NormalizeCpf() @IsCpf()`; na URL: `ParseCpfPipe`.
- **Nada de CPF sequencial ou de exemplo em seed, testes ou Swagger:** usar CPFs fictícios gerados aleatoriamente (`SEED_CPFS` e os do `test/patients.e2e-spec.ts`). Os mocks do front ainda usam `123.456.789-09` etc.; avisar o Gustavo (no modo API o site usa os dados do seed).
- Erros: lançar `NotFoundException('...')`, `ForbiddenException('...')` etc. com mensagem própria; o filtro cuida do formato.
- Configuração sempre por variável de ambiente (`ConfigService`), nunca fixa no código. A API precisa ser **stateless** (nada gravado em disco ou memória do servidor), para escalar em várias instâncias na AWS.
- Versões:
  - NestJS 12, TypeScript 6, Mongoose 9, Vitest 4, mongodb-memory-server 11;
  - Node 20+ (testado no Node 24).

## Próximos blocos (em ordem)

Cada bloco de funcionalidade **inclui os testes e2e dele**, **a parte do seed dele** e **a documentação Swagger das rotas dele**.

### ✅ Bloco 5 — Base de testes, seed, saúde e Swagger (em 5 commits)
1. `docs: decisões de infraestrutura, custos e Swagger`
2. `feat(backend): seed de usuários e modo dev:memory`
3. `feat(backend): health check da API e do MongoDB`
4. `docs(backend): Swagger documentado e exportação do OpenAPI`
5. `test(backend): base de testes e2e e testes de autenticação, health e Swagger`

- `src/database/seed.ts`:
  - exporta `runSeed(connection)`, que limpa as coleções e insere os dados;
  - quando roda direto (`npm run seed`), conecta no `MONGODB_URI`.
  - Os dados vêm de `src/database/seed-data.ts`, copiados de `frontend/src/mocks/`:
    - remover os ids fixos (`al-1`, `at-101`...);
    - nos atendimentos, trocar `doctorId` por `doctorEmail` (`medico@teste.com`, `cardio@teste.com`) e remover `patientName`;
    - trazer junto `lastMonths()` de `frontend/src/utils/format.ts`.
  - Neste bloco, só os usuários. Senha de todos: `123456`, gravada com hash bcrypt.
- `src/dev-memory.ts`: sobe um `MongoMemoryReplSet` de 1 nó (necessário para transação), define `MONGODB_URI`, roda o seed e importa o `main`.
- `GET /api/health` (público): devolve status da API e do MongoDB. Usado pelo health check do ALB e pelo monitoramento.
- `test/helpers.ts`:
  - sobe o `MongoMemoryReplSet` e cria o app com `configureApp`;
  - roda o seed;
  - tem uma função `login(email)` que devolve o token.
- `test/auth.e2e-spec.ts`: login ok/401/400, `/auth/me` com e sem token, senha nunca aparece na resposta.
- Swagger: `src/swagger.ts` (`setupSwagger`, `buildOpenApiDocument`), classes de resposta em `src/auth/auth.responses.ts`, script `src/openapi.ts` (`npm run openapi` → `docs/openapi.json`) e `test/swagger.e2e-spec.ts`.

### ✅ Bloco 6 — Pacientes e auditoria (em 7 commits)
1. `feat(backend): schema do paciente com o prontuário embutido`
2. `feat(backend): validação de CPF e datas e DTO de cadastro de paciente`
3. `feat(backend): trilha de auditoria de acesso ao prontuário (LGPD)`
4. `feat(backend): rotas de pacientes com documentação Swagger`
5. `feat(backend): pacientes no seed`
6. `test(backend): testes e2e de pacientes e auditoria`
7. `docs: atualiza o CONTINUAR com os blocos 5 e 6`

Plano original:
- `src/patients/patient.schema.ts`:
  - cpf (unique, index), fullName, birthDate (string AAAA-MM-DD), sex (`F|M|Outro`), bloodType (enum do contrato), phone?, email?, region;
  - listas embutidas `allergies`, `activeMedications`, `procedures`, `exams`, `clinicalConditions`, como subschemas com `jsonSchemaOptions` para o `_id` virar `id`.
- `CreatePatientDto`:
  - CPF com `@Digits()` e validação;
  - `@EmptyToUndefined()` em phone e email, porque o front manda `""`;
  - enums do contrato e region obrigatório.
- `GET /patients/:cpf` (perfil medico):
  - 404 `'Paciente não encontrado.'` se o CPF não existir;
  - `appointmentSummaries` sai como `[]` até o bloco 7.
- `POST /patients` (medico):
  - 201 com o paciente e as listas vazias;
  - 400 se o CPF for inválido;
  - 409 `'Já existe um paciente cadastrado com este CPF.'`.
- Auditoria (LGPD; o requisito não funcional fala em auditoria de acessos): módulo `audit` grava quem acessou cada prontuário (userId, action, patientCpf, data).
- Seed: pacientes. Testes: 404, 201, 409, 400, gestor recebe 403.

### ✅ Bloco 7 — Atendimentos (em 8 commits)
- Feito como planejado, mais: regras de data/resumo iguais às do formulário do site, remarcação de agendamento, agendamento de outro médico (403) ou de outro paciente (400), 409 se já registrado, CID-10 validado, auditoria `appointments.view` e `appointment.create`, mensagens legíveis em erros de lista.
- `TransactionRunner` (`src/database/transaction.runner.ts`): `MONGODB_TRANSACTIONS=false` desliga a transação **só** para banco sem replica set (é como o Claude roda os testes no FerretDB).
- Documentos ainda não entram no seed (sem arquivo para baixar); ficam para o bloco 8.

Plano original:
- Schema Appointment:
  - patientCpf, patientName, doctorId (ObjectId), doctorName, date (Date), status (`realizado|agendado`), reason?, summary;
  - documents [{fileName, type, uploadedAt, storageKey, mimeType, size}].
- `GET /appointments?doctorId=`: só o próprio médico (senão 403), em ordem crescente de data.
- `GET /appointments?patientCpf=`: ordem decrescente de data.
- Sem `doctorId` nem `patientCpf`: 400.
- `POST /appointments`:
  - o `doctorId` precisa ser o do token, senão 403;
  - tudo dentro de `connection.transaction()`:
    - se vier `scheduledAppointmentId`, atualiza esse agendamento (validar com `isValidObjectId`, senão 404);
    - senão, cria um atendimento novo;
    - adiciona `newAllergies`, `newMedications` (prescribedBy padrão = nome do médico) e `newConditions` ao paciente.
- Ligar `appointmentSummaries` no GET do paciente: só atendimentos `realizado`, do mais recente ao mais antigo, com a `specialty` do médico.
- Seed: atendimentos. Testes: agendamento convertido, prontuário atualizado, 403 com outro médico.

### ✅ Bloco 8 — Documentos com armazenamento em nuvem (em 6 commits)
- Feito como planejado, com uma mudança no download: em vez de redirecionar, `GET /appointments/:id/documents/:documentId/download` devolve `{ url, expiresAt }`.
  O link vale 5 min e não precisa do token (o site e o app só abrem a URL). No S3 é URL pré-assinada; no driver local, link assinado com HMAC servido por `GET /api/files/:token`.
- Tipo do arquivo conferido pelos primeiros bytes (não pelo nome); chave no armazenamento = `appointments/<id>/<documentId>.<ext>` (nunca o nome do usuário).
- S3: `ServerSideEncryption: AES256`; credenciais pela role da AWS, nunca no código. `S3_ENDPOINT` opcional para MinIO/LocalStack.
- Se a gravação no banco falhar depois do upload, o arquivo é apagado do armazenamento.
- Exame criado por laudo/exame guarda `appointmentId` e `documentId`. Auditoria: `document.upload` e `document.download`.
- Seed grava PDFs de demonstração (`demo-pdf.ts`) para os 4 documentos dos mocks.
- **Para o Gustavo (site):** botão de baixar = `GET .../download` com o token e depois `window.open(body.url)`.

Plano original:
- Interface `StorageService` com dois drivers, escolhidos pela variável `STORAGE_DRIVER`:
  - `local`: grava em `UPLOAD_DIR`; usado em desenvolvimento e nos testes;
  - `s3`: usa `@aws-sdk/client-s3` com bucket em `S3_BUCKET` e região em `AWS_REGION`.
  - O nome do campo no schema é `storageKey`, não `storedName`; atualizar `HIDDEN_FIELDS` em `schema-options.ts`.
- `POST /appointments/:id/documents`, em `multipart/form-data` com os campos `file` e `type`:
  - usar o multer com `memoryStorage` e mandar o arquivo para o `StorageService`;
  - aceitar só PDF, JPG e PNG, com limite de 10 MB;
  - só o médico do atendimento pode enviar;
  - `laudo` e `exame` também criam uma entrada em `exams` do paciente;
  - conferir a codificação de nome de arquivo com acento (o multer pode entregar em latin1).
- `GET /appointments/:id/documents/:documentId/file`: no S3, redireciona para uma URL pré-assinada; no driver local, faz stream do arquivo.
- Testes com o driver local: upload ok, tipo de arquivo proibido (400), arquivo grande demais (413), outro médico (403).
- Seed: anexar aos atendimentos os documentos dos mocks (`frontend/src/mocks/appointments.ts`), gravando PDFs de exemplo no armazenamento para o download funcionar na demo.

### ✅ Bloco 9 — Painel do gestor (em 6 commits)
- Feito como planejado, com uma mudança: `GET /regions` é de **médico e gestor**, porque o formulário de cadastro de paciente do site usa a lista. `GET /regional-data` continua só do gestor.
- Dados do seed com o mesmo gerador e a mesma semente do mock do site (12 meses completos × 6 regiões), representando totais que chegariam agregados dos sistemas municipais.
- Região do paciente validada pela coleção `regions` (região nova cadastrada no banco já vale no formulário, sem mudar código).
- Resposta sem `_id` nem nenhum dado de paciente (teste de anonimato).

Plano original:
- Coleções:
  - `regions`;
  - `regional_stats` {region, month 'AAAA-MM', appointments, uniquePatients, conditions[{name,count}]}, com subschema `_id: false` e índice em (region, month).
- `GET /regions` e `GET /regional-data?region=&from=&to=`, ambos com `@Roles('gestor')`. Validar o formato AAAA-MM e ordenar por região e mês.
- Usar as regiões também para validar `region` no cadastro de paciente.
- Seed: regiões e dados regionais. Testes: filtros funcionam e médico recebe 403.

### ✅ Bloco 10 — Paciente no app, login por CPF estilo gov.br (em 6 commits)
- Decisão do grupo: **CPF + senha**, como no gov.br. Médico e gestor continuam com e-mail.
- Primeiro acesso (`POST /auth/patient-register`): CPF + data de nascimento conferidos com o prontuário + senha nova (regras em `common/password.ts`). Mensagens iguais para "não existe" e "não confere" (não revela quem é paciente nem quem tem conta).
- Rotas `/me` documentadas na seção 5 do `API_CONTRACT.md`. Incluí `GET /me/access-log` (LGPD) e o download dos próprios documentos.
- Seed: Maria e João com conta (`paciente123`); os outros sem conta, para o primeiro acesso.
- O seed usa `syncIndexes()`: ajusta os índices de bancos criados em versões anteriores (o índice único de e-mail virou sparse).
- **Atenção (bloco 13):** login e primeiro acesso precisam de limite de tentativas (`@nestjs/throttler`), senão dá para tentar senhas ou datas de nascimento em massa.

Plano original:
- Fica fora do contrato atual. Ao terminar, documentar no `API_CONTRACT.md` (seção nova "5. Paciente (app)").
- Novo perfil `paciente` em `USER_ROLES`:
  - o usuário fica ligado ao `cpf` do paciente;
  - login com CPF + senha (ex.: `POST /auth/patient-login`) ou e-mail; definir com o grupo.
- Rotas do paciente, só leitura (pelos requisitos, o paciente não altera os próprios dados):
  - `GET /me/record`: a "carteira digital de saúde";
  - `GET /me/appointments?status=realizado|agendado`: histórico e próximos atendimentos;
  - `GET /me/exams`: exames e resultados.
  - `GET /me/access-log`: quem acessou o prontuário (LGPD: o paciente acompanha os acessos; usar `AuditService.findByPatient`).
- Seed: um paciente de teste (ex.: Maria). Testes: paciente só vê os próprios dados e recebe 403 nas rotas de médico.

### ✅ Bloco 11 — Docker e CI (em 7 commits)
- `backend/Dockerfile` multi-stage (Node 24 slim, não-root, `npm ci --ignore-scripts` para não baixar o MongoDB dos testes, HEALTHCHECK em `/api/health/live`) e `.dockerignore`.
- `docker-compose.yml` na raiz: `mongo:8` como replica set `rs0` (o health check inicia o replica set e só libera quando o nó é primário) + API. Seed: `docker compose run --rm api node dist/database/seed.js`.
- `.github/workflows/ci.yml` (actions v6/v5, que rodam em Node 24): job **API** (typecheck + `npm run test:ci` com cobertura mínima, resumo na página do job e artefato `relatorios-testes-api` com cobertura HTML/lcov + JUnit), job **Docker** (`docker compose up --wait`, seed, teste de fumaça) e job **Site** (build).
- Cobertura atual: ~97% das linhas, ~88% dos branches.
- Selo do CI e seção de Docker/testes no README da raiz.
- Testado de verdade no Docker Desktop do Matheus (05/11): imagem com 101 MB, API e MongoDB saudáveis, seed ok, teste de fumaça 9/9, contêiner rodando como `node`.
- Esse teste mostrou o aviso "Duplicate DTO: DownloadLinkResponse" do Swagger (a mesma classe criada em dois controllers; vira erro na próxima versão do `@nestjs/swagger`). Corrigido com uma classe só em `appointment.responses.ts`, e o teste do Swagger agora falha se a geração da documentação emitir qualquer aviso.
- `npm audit` acusa 2 vulnerabilidades moderadas só nas dependências de desenvolvimento (as de produção têm 0). Revisar no bloco 13.

Plano original:
- `backend/Dockerfile` multi-stage (build → runtime Node slim, usuário não-root) e `.dockerignore`.
- `docker-compose.yml` na raiz: a API e um MongoDB rodando como replica set (`--replSet rs0` + init), para quem quiser rodar sem `dev:memory`.
- `.github/workflows/ci.yml`:
  - roda em todo push e PR;
  - no backend: typecheck, testes e2e com relatório de cobertura (`@vitest/coverage-v8`), publicado como artifact;
  - no frontend: build.
- Badge do CI no README.

### Bloco 12 — AWS → `chore(infra): infraestrutura AWS como código`
- Infra como código em `infra/`, com **AWS CDK em TypeScript** (mesma linguagem do projeto). É a evidência de "configurações de cloud" que o manual pede.
  - **ECR**: repositório da imagem Docker da API.
  - **ECS Fargate + Application Load Balancer:**
    - health check em `/api/health`;
    - **auto scaling** por CPU, de 1 a 3 tarefas (evidência de escalabilidade).
  - **S3**: bucket privado para os documentos, com criptografia e bloqueio de acesso público. A permissão vem pela role da tarefa ECS, sem chave no código.
  - **Secrets Manager / SSM**: `JWT_SECRET` e `MONGODB_URI`.
  - **CloudWatch:**
    - logs da API;
    - dashboard com CPU, memória, requisições e 5xx do ALB;
    - alarmes de 5xx e de health check (monitoramento básico).
  - Banco: **MongoDB Atlas** (free tier, já é replica set) na região da AWS `sa-east-1`. Alternativa: DocumentDB, mais caro.
  - Site: manter na Vercel ou mover para S3 + CloudFront.
- Workflow `.github/workflows/deploy.yml`: build da imagem, push no ECR e atualização do serviço ECS. Autenticação por OIDC, sem chave da AWS no GitHub.
- **Custo (ver "Decisões de infraestrutura e custo"):** teto de R$ 50 no projeto todo.
  - Duas stacks no CDK: `ApiStack` (EC2 pequena com Docker + S3 + CloudWatch, fica no ar durante a entrega) e `ScaleTestStack` (ECS Fargate + ALB + auto scaling, sobe só para o teste de carga e é destruída logo depois).
  - Se ECS/ALB não estiverem liberados no plano Free, a escalabilidade vira **Auto Scaling Group** de EC2.
  - Destruir tudo depois da apresentação (`cdk destroy --all`).
- `docs/infraestrutura.md`: diagrama da arquitetura AWS, passo a passo do deploy, custos.

### Bloco 13 — Pasta `tests/` (Qualidade) → `test: plano de testes, testes de carga e relatórios`
O manual exige a pasta `/tests` na raiz com relatórios e evidências. Os testes de código continuam em `backend/test/`; a raiz organiza a parte de qualidade:

```
tests/
├─ README.md                  como rodar cada tipo de teste e onde estão as evidências
├─ plano-de-testes.md         escopo, estratégia, tipos de teste, ambiente, critérios de aceite, casos de teste (tabela RF → caso → resultado)
├─ carga/                     scripts k6: login, busca de prontuário, registro de atendimento
├─ seguranca/                 casos: sem token, perfil errado, token adulterado, injeção NoSQL, upload proibido, CORS
└─ relatorios/                resultados dos e2e, cobertura, k6 (antes/depois, 1 vs 3 instâncias), prints do CloudWatch e do CI
```

- Testes não funcionais:
  - **desempenho**: tempo de resposta p95;
  - **carga e escalabilidade**: k6 contra a AWS com o auto scaling ligado;
  - **segurança**: os casos listados em `seguranca/`;
  - **disponibilidade**: health check e alarmes.
- Otimizações da Fase 5 com evidência: índices no Mongo, paginação, compressão (`compression`), rate limit no login (`@nestjs/throttler`) e `helmet`.

### Bloco 14 — Integração e documentação → `docs: README da API, arquitetura e integração`
- Ligar o site na API: `frontend/.env` com `VITE_USE_MOCK=false` e `VITE_API_URL` apontando para a API (local e AWS). Testar as telas de ponta a ponta.
- `backend/README.md`: como rodar (local, dev:memory, Docker), variáveis, usuários de teste, rotas, testes.
- `docs/arquitetura.md`: visão geral (site, app, API, MongoDB, S3), decisões (NestJS, MongoDB, JWT, AWS) e LGPD.
- README da raiz no padrão "profissional" do manual: descrição, problema, arquitetura, tecnologias, como rodar, testes, deploy, equipe.

### App mobile (em paralelo, Matheus ajuda)
- `mobile/` com **React Native + Expo + TypeScript**, consumindo o bloco 10.
- Telas, conforme os requisitos:
  - **Histórico**: o que o paciente já fez;
  - **Atendimentos**: o que vai fazer;
  - **Carteira Digital de Saúde**: o cadastro dele.
- Reaproveitar os tipos do contrato (`frontend/src/types/index.ts`).
- Testes do app entram no plano de testes (bloco 13).

## Observações

- O MongoDB precisa ser **replica set** por causa da transação no `POST /appointments` (o Atlas já é). Sem MongoDB instalado: `npm run dev:memory` (bloco 5).
- O `npm` novo bloqueia scripts de instalação; o `mongodb-memory-server` baixa o binário do MongoDB no primeiro uso, então não faz diferença.
- No Windows:
  - instalar o Node 20+ e o Git;
  - clonar o repo e rodar `git switch feat/backend-api`;
  - rodar `npm ci` em `backend/`;
  - para os blocos 11 e 12: Docker Desktop, AWS CLI e `npm i -g aws-cdk`.
- O deploy do site na Vercel precisa do *Root Directory* = `frontend`, porque o site saiu da raiz do repositório. Combinar com o Gustavo.
