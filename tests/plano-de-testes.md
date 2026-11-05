# Plano de testes — Saúde Unificada

| Item | Valor |
|---|---|
| Projeto | Saúde Unificada: prontuário unificado por CPF (PI 6, DSM) |
| Versão do plano | 1.0 (05/11/2026) |
| Sistema em teste | API (`backend/`), infraestrutura AWS (`infra/`), site (`frontend/`) |
| Base | Requisitos em [`docs/estrutura-base-requisitos.pdf`](../docs/estrutura-base-requisitos.pdf) e [`docs/sprint-1-planejamento.pdf`](../docs/sprint-1-planejamento.pdf); contrato em [`docs/API_CONTRACT.md`](../docs/API_CONTRACT.md) |

## 1. Objetivo

Garantir que a plataforma cumpre os requisitos funcionais e não funcionais antes de cada entrega. Os dados envolvidos são de saúde (sensíveis pela LGPD), então o foco está em três coisas:

- **controle de acesso por perfil**;
- **integridade do prontuário**;
- **segurança**.

## 2. Escopo

**Dentro do escopo**
- Todas as rotas da API: autenticação, pacientes, atendimentos, documentos, dados regionais, app do paciente e saúde.
- Regras de negócio: validação de CPF, atualização do prontuário em transação, separação de perfis, auditoria de acessos.
- Infraestrutura como código: custo, segurança, escalabilidade e monitoramento.
- Requisitos não funcionais: segurança, desempenho, carga e escalabilidade, disponibilidade e manutenibilidade.

**Fora do escopo nesta versão**
- Testes automatizados de interface do site e do app. O site é coberto por build no CI e pelo roteiro manual da seção 8; o app está em desenvolvimento.
- Testes de penetração por terceiros e testes de recuperação de desastre.

## 3. Estratégia

| Nível / tipo | Objetivo | Como | Onde |
|---|---|---|---|
| Unitário | Regras isoladas (CPF, senha, tipo de arquivo, links assinados) | Vitest | `backend/test/*.spec.ts` |
| Integração / ponta a ponta (funcional) | Cada rota com HTTP real, validação, banco e permissões | Vitest + Supertest, API completa com MongoDB em memória (replica set, igual ao Atlas) e seed de demonstração | `backend/test/*.e2e-spec.ts` |
| Contrato | Respostas no formato do `API_CONTRACT.md` e documentação OpenAPI sempre atualizada | Asserções de formato + teste que compara `docs/openapi.json` | `patients`, `appointments`, `swagger.e2e-spec.ts` |
| Infraestrutura | Regras de custo, segurança e escalabilidade da AWS antes de qualquer deploy | Assertions do AWS CDK sobre o CloudFormation gerado | `infra/test/infra.test.ts` |
| Fumaça | O básico funciona numa API no ar (Docker no CI e AWS após o deploy) | Script Node, 9 verificações | `backend/scripts/smoke-test.mjs` |
| Segurança (não funcional) | Autenticação, autorização, injeção, upload, cabeçalhos e força bruta | Testes automatizados + `npm audit` | [`seguranca/casos-de-seguranca.md`](seguranca/casos-de-seguranca.md) |
| Desempenho e carga (não funcional) | Tempo de resposta (p95), vazão e taxa de erro sob carga | `load-test.mjs` | [`carga/README.md`](carga/README.md) |
| Escalabilidade (não funcional) | Auto scaling de 1 a 3 tarefas na AWS sob carga | `load-test.mjs` + dashboard do CloudWatch | [`carga/README.md`](carga/README.md) |
| Disponibilidade (não funcional) | Health check, alarmes e recuperação de falha | Testes do `/api/health`, testes da infra (alarmes, circuit breaker) | `health.e2e-spec.ts`, `infra.test.ts` |
| Manutenibilidade | Código tipado e coberto por testes | `tsc --noEmit` + cobertura mínima no CI | `vitest.config.e2e.ts` |
| Regressão | Nada quebra entre versões | Toda a suíte em cada push (GitHub Actions) | `.github/workflows/ci.yml` |

**Dados de teste.** O seed (`backend/src/database/seed-data.ts`) traz médicos, gestora, pacientes, atendimentos e dados regionais fictícios. Os CPFs são válidos pelas regras do dígito verificador e não são sequenciais nem de exemplo. Cada arquivo de teste usa um banco novo, apagado no fim, e os arquivos rodam em paralelo sem interferir entre si.

## 4. Ambientes

| Ambiente | Uso | Banco | Arquivos |
|---|---|---|---|
| Local / CI | Unitários, ponta a ponta, segurança | MongoDB em memória (replica set de 1 nó) | Driver local (pasta temporária) |
| Docker (CI) | Fumaça com a imagem real | MongoDB 7 no `docker-compose.yml` | Driver local |
| AWS (us-east-1) | Fumaça, carga e escalabilidade | MongoDB Atlas (M0) | S3 |

## 5. Ferramentas

- Vitest 4
- Supertest 7
- mongodb-memory-server 11
- cobertura v8
- `node:test` + AWS CDK assertions
- GitHub Actions
- `npm audit`
- scripts Node próprios (fumaça e carga)
- CloudWatch (métricas durante a carga)

## 6. Critérios

**Entrada** (para começar a testar uma versão): o código compila (`npm run typecheck`) e o seed aplica sem erro.

**Saída / aceite** (para uma versão ser entregue):

| Critério | Meta |
|---|---|
| Testes automatizados da API e da infra | 100% passando |
| Cobertura da API (bloqueia o CI se cair) | ≥ 90% de linhas, comandos e funções; ≥ 80% de branches |
| Vulnerabilidades em dependências de produção | Nenhuma alta ou crítica |
| Teste de fumaça (Docker e AWS) | 9 de 9 verificações |
| Carga (AWS, 20 usuários simultâneos no login) | Taxa de erro < 1% |
| Escalabilidade (AWS) | Auto scaling sobe para ≥ 2 tarefas sob carga e volta a 1 depois |
| Defeitos de severidade alta abertos | Nenhum |

## 7. Rastreabilidade: requisitos → testes

### Funcionais

| Requisito | Casos de teste (arquivo) |
|---|---|
| RF01 Cadastro unificado de pacientes por CPF | `patients.e2e-spec.ts` (cadastro, 409 de CPF repetido, CPF com máscara, campos vazios); `cpf.spec.ts` (regras do dígito verificador, CPFs de exemplo recusados) |
| RF02 Prontuário unificado: alergias, medicamentos, procedimentos, exames, condições, resumo dos atendimentos | `patients.e2e-spec.ts` (formato do contrato, resumo com especialidade, 404 para CPF inexistente) |
| RF03 Prontuário atualizado a cada atendimento pelo profissional | `appointments.e2e-spec.ts` (registro atualiza o prontuário, conclui/remarca agendamento, nada é gravado em caso de erro) |
| RF04 Upload de receita, laudo e exame | `documents.e2e-spec.ts` (upload, download idêntico, acentos, laudo/exame no prontuário); `uploads.spec.ts`; `storage.spec.ts` |
| RF05 Login com redirecionamento por perfil (médico, gestor) | `auth.e2e-spec.ts` (login, perfil no token, `/auth/me`) |
| RF06 Médico vê atendimentos passados e próximos | `appointments.e2e-spec.ts` (agenda em ordem, 403 na agenda de outro médico) |
| RF07 Gestor gera dashboard por região | `regional.e2e-spec.ts` (12 meses, filtros de região e período, dados anônimos, 403 para médico) |
| RF08 App do paciente: histórico, próximos atendimentos, carteira digital | `patient-app.e2e-spec.ts` (login por CPF, primeiro acesso, `/me/record`, `/me/appointments`, `/me/exams`) |
| RF09 Paciente não altera os próprios dados | `patient-app.e2e-spec.ts` (rotas `/me` só de leitura; 403 nas rotas do médico; paciente não entra pelo login do site) |
| RF10 Controle de privacidade e registro de acessos (LGPD) | `patients.e2e-spec.ts` (auditoria de quem viu e cadastrou); `appointments`/`documents` (auditoria); `patient-app.e2e-spec.ts` (`/me/access-log`) |

### Não funcionais

| Requisito | Como é verificado |
|---|---|
| RNF01 Segurança da informação e controle de perfis de acesso | `security.e2e-spec.ts` + casos em [`seguranca/`](seguranca/casos-de-seguranca.md); `infra.test.ts` (bucket privado, segredos no SSM, ALB só via CloudFront) |
| RNF02 Conformidade com a LGPD | Auditoria de acessos, dados regionais anônimos, senha nunca exposta, documentos com link temporário |
| RNF03 Alta disponibilidade e infraestrutura resiliente em nuvem | `health.e2e-spec.ts` (inclusive com o banco fora do ar); `infra.test.ts` (2 zonas, circuit breaker com rollback, 4 alarmes); fumaça na AWS |
| RNF04 Escalabilidade | `infra.test.ts` (auto scaling 1–3 pela CPU); teste de carga na AWS ([`carga/`](carga/README.md)) |
| RNF05 Desempenho | `load-test.mjs`: p95 e vazão (linha de base local + AWS) |
| RNF06 Manutenibilidade e documentação | Cobertura mínima no CI; `swagger.e2e-spec.ts` (toda rota documentada, OpenAPI atualizado) |
| RNF07 Chatbot de suporte (site) | Roteiro manual (seção 8) |

## 8. Roteiro manual do site (com a API real)

Executado depois da integração do site com a API (`VITE_USE_MOCK=false`). O resultado é registrado no relatório da rodada.

| # | Caso | Resultado esperado |
|---|---|---|
| M01 | Login como médico (`medico@teste.com`) | Vai para a área do médico |
| M02 | Login como gestor (`gestor@teste.com`) | Vai para o painel do gestor |
| M03 | Senha errada | Mensagem "E-mail ou senha inválidos." |
| M04 | Buscar CPF cadastrado | Abre o prontuário com alergias em destaque |
| M05 | Buscar CPF válido não cadastrado | Oferece o cadastro |
| M06 | Registrar atendimento com alergia nova e receita em PDF | Alergia aparece no prontuário; documento baixa |
| M07 | Painel do gestor com filtro de região e período | Indicadores e gráficos mudam |
| M08 | Chatbot: "dados errados" e "falha de acesso" | Mostra as respostas prontas; fecha com Esc |
| M09 | Abrir `/gestor` logado como médico | Redireciona para a área do médico |
| M10 | Site no celular (largura 375 px) | Menu lateral vira gaveta, nada corta |

## 9. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Teste depender de serviço externo (Atlas, S3) e ficar instável | MongoDB em memória e driver local de arquivos nos testes; S3 testado com cliente simulado |
| Teste de carga na AWS gerar custo | Rodadas curtas (10 min), Fargate Spot, orçamento de US$ 18 com alertas, `destroy:api` logo depois |
| Limite de tentativas de login atrapalhar a carga | Desligado só durante a carga (`-c loginRateLimit=false`), religado em seguida |
| Contador do limite de login por instância (com 3 tarefas o limite real triplica) | Aceito para o projeto; em produção, armazenamento compartilhado (Redis) |
| Mudança na API quebrar o site ou o app | Testes de contrato + `docs/openapi.json` conferido no CI |

## 10. Gestão de defeitos

Defeitos encontrados viram **issue no GitHub**, com o rótulo `bug` e uma severidade:

- **alta**: impede um fluxo principal ou expõe dados;
- **média**: fluxo funciona com contorno;
- **baixa**: visual ou texto.

A correção entra com um teste que reproduz o defeito, no commit `fix(...)`, e o relatório da rodada lista o que foi corrigido.

## 11. Responsáveis e cronograma

| Atividade | Responsável | Quando |
|---|---|---|
| Testes da API e da infra (automatizados) | Matheus | A cada bloco (já em execução no CI) |
| Carga e escalabilidade na AWS | Matheus | Após o primeiro deploy (bloco 12) |
| Roteiro manual do site | Gustavo | Após a integração (bloco 14) |
| Testes do app | Equipe do app | Quando o app estiver funcional |
| Relatório final de qualidade | Equipe | Antes da entrega de 19/11/2026 |
