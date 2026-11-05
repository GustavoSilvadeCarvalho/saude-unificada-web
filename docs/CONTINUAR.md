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
- O ambiente do Claude **não consegue baixar o MongoDB** (download bloqueado), então quem roda `npm run dev:memory` e `npm run test:e2e` é o Matheus, no Windows. O Claude roda o `typecheck`.
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

1. `chore: reorganiza repositório em monorepo (frontend, backend, mobile, docs)`
2. `chore(backend): setup do projeto NestJS com MongoDB`
3. `feat(backend): bootstrap da API, validação, CORS, Swagger e filtro de erros`
4. `feat(backend): login com JWT e controle de acesso por perfil`

```
backend/
├─ package.json            "type": "module"; scripts dev, build, start, typecheck, test:e2e, seed, dev:memory (seed e dev:memory ainda sem arquivo)
├─ tsconfig.json           nodenext, decorators + emitDecoratorMetadata, strict
├─ tsconfig.build.json     rootDir ./src (o TS 6 exige rootDir explícito)
├─ nest-cli.json
├─ vitest.config.e2e.ts    testes em test/**/*.e2e-spec.ts, hookTimeout 120s
├─ .env.example            PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGINS, UPLOAD_DIR
└─ src/
   ├─ main.ts              bootstrap + Swagger em /api/docs
   ├─ app.setup.ts         configureApp(app): prefixo /api, CORS, ValidationPipe(whitelist, transform), filtro de erros (usar também nos testes)
   ├─ app.module.ts        ConfigModule global, MongooseModule.forRootAsync(MONGODB_URI), UsersModule, AuthModule
   ├─ common/
   │  ├─ cpf.ts            onlyDigits, isValidCpf, completeCpf
   │  ├─ schema-options.ts jsonSchemaOptions: toJSON troca _id→id e remove __v, passwordHash, storedName (usar em TODO schema e subschema)
   │  ├─ roles.ts          USER_ROLES ['medico','gestor'], @Roles(...), @Public(), interface AuthUser {id,name,role}
   │  ├─ current-user.decorator.ts  @CurrentUser()
   │  ├─ transforms.ts     @EmptyToUndefined(), @Trim(), @Digits() (class-transformer)
   │  └─ http-exception.filter.ts   toda resposta de erro = { statusCode, message } em português; E11000 → 409
   ├─ users/               schema User (passwordHash select:false), UsersService.findByEmailWithPassword / findById
   └─ auth/                POST /auth/login (público), GET /auth/me; AuthGuard global (APP_GUARD) valida o JWT e o @Roles
```

Testado manualmente: a API sobe, o login responde 401/400 com mensagem em português, `/auth/me` sem token dá 401 e o Swagger abre. Ainda **não há usuários no banco** (eles chegam com o seed).

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
- Erros: lançar `NotFoundException('...')`, `ForbiddenException('...')` etc. com mensagem própria; o filtro cuida do formato.
- Configuração sempre por variável de ambiente (`ConfigService`), nunca fixa no código. A API precisa ser **stateless** (nada gravado em disco ou memória do servidor), para escalar em várias instâncias na AWS.
- Versões:
  - NestJS 12, TypeScript 6, Mongoose 9, Vitest 4, mongodb-memory-server 11;
  - Node 20+ (testado no Node 24).

## Próximos blocos (em ordem)

Cada bloco de funcionalidade **inclui os testes e2e dele**, **a parte do seed dele** e **a documentação Swagger das rotas dele**.

### Bloco 5 — Base de testes, seed, saúde e Swagger (em 5 commits)
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

### Bloco 6 — Pacientes → `feat(backend): cadastro e prontuário unificado de pacientes`
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

### Bloco 7 — Atendimentos → `feat(backend): registro de atendimentos com atualização do prontuário`
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

### Bloco 8 — Documentos com armazenamento em nuvem → `feat(backend): upload de receitas e laudos com armazenamento no S3`
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

### Bloco 9 — Painel do gestor → `feat(backend): dados regionais para o painel do gestor`
- Coleções:
  - `regions`;
  - `regional_stats` {region, month 'AAAA-MM', appointments, uniquePatients, conditions[{name,count}]}, com subschema `_id: false` e índice em (region, month).
- `GET /regions` e `GET /regional-data?region=&from=&to=`, ambos com `@Roles('gestor')`. Validar o formato AAAA-MM e ordenar por região e mês.
- Usar as regiões também para validar `region` no cadastro de paciente.
- Seed: regiões e dados regionais. Testes: filtros funcionam e médico recebe 403.

### Bloco 10 — Perfil paciente (para o app) → `feat(backend): acesso do paciente aos próprios dados`
- Fica fora do contrato atual. Ao terminar, documentar no `API_CONTRACT.md` (seção nova "5. Paciente (app)").
- Novo perfil `paciente` em `USER_ROLES`:
  - o usuário fica ligado ao `cpf` do paciente;
  - login com CPF + senha (ex.: `POST /auth/patient-login`) ou e-mail; definir com o grupo.
- Rotas do paciente, só leitura (pelos requisitos, o paciente não altera os próprios dados):
  - `GET /me/record`: a "carteira digital de saúde";
  - `GET /me/appointments?status=realizado|agendado`: histórico e próximos atendimentos;
  - `GET /me/exams`: exames e resultados.
- Seed: um paciente de teste (ex.: Maria). Testes: paciente só vê os próprios dados e recebe 403 nas rotas de médico.

### Bloco 11 — Docker e CI → `chore(infra): Docker, docker-compose e pipeline de testes no GitHub Actions`
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
