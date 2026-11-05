# Relatório de qualidade — rodada de 05/11/2026

| Item | Valor |
|---|---|
| Versão testada | Branch `feat/backend-api`, bloco 13 (segurança e qualidade) |
| Ambiente | Local: AMD Ryzen 5 5600GT (12 núcleos), 15 GB, Linux, Node 24.21; MongoDB em memória |
| Plano seguido | [`../plano-de-testes.md`](../plano-de-testes.md) |
| Situação | **Aprovado** nos critérios locais. Pendentes os cenários que dependem da AWS (seção 6) |

## 1. Resumo

| Critério do plano | Meta | Resultado | Situação |
|---|---|---|---|
| Testes da API | 100% passando | 213 de 213 | ✅ |
| Testes da infraestrutura | 100% passando | 20 de 20 | ✅ |
| Cobertura de linhas / comandos / funções | ≥ 90% | 96,88% / 95,87% / 96,50% | ✅ |
| Cobertura de branches | ≥ 80% | 88,82% | ✅ |
| Vulnerabilidades altas ou críticas em produção | 0 | 0 | ✅ |
| Teste de fumaça (local) | 9 de 9 | 9 de 9 | ✅ |
| Carga local: taxa de erro | < 1% | 0% (1.012 requisições) | ✅ |
| Carga e escalabilidade na AWS | Ver plano | — | ⏳ Pendente (deploy) |

## 2. Testes funcionais da API

Detalhe de cada caso: [`junit-api-2026-11-05.xml`](junit-api-2026-11-05.xml).

| Arquivo | Tipo | Testes | Resultado |
|---|---|---|---|
| `appointments.e2e-spec.ts` | Ponta a ponta | 30 | ✅ |
| `auth.e2e-spec.ts` | Ponta a ponta | 12 | ✅ |
| `documents.e2e-spec.ts` | Ponta a ponta | 17 | ✅ |
| `health.e2e-spec.ts` | Ponta a ponta | 4 | ✅ |
| `patient-app.e2e-spec.ts` | Ponta a ponta | 26 | ✅ |
| `patients.e2e-spec.ts` | Ponta a ponta | 37 | ✅ |
| `regional.e2e-spec.ts` | Ponta a ponta | 15 | ✅ |
| `security.e2e-spec.ts` | Segurança | 16 | ✅ |
| `swagger.e2e-spec.ts` | Contrato / documentação | 5 | ✅ |
| `cpf.spec.ts` | Unitário | 19 | ✅ |
| `password.spec.ts` | Unitário | 15 | ✅ |
| `storage.spec.ts` | Unitário | 9 | ✅ |
| `uploads.spec.ts` | Unitário | 8 | ✅ |
| **Total** | | **213** | **✅ 0 falhas** |

Tempo total da suíte: cerca de 6 s, com os 13 arquivos em paralelo e cada um com o próprio MongoDB em memória.

## 3. Cobertura de código

Detalhe por arquivo: [`cobertura-api-2026-11-05.json`](cobertura-api-2026-11-05.json). O HTML navegável sai em `backend/coverage/` (`npm run test:cov`) e como artefato no GitHub Actions.

| Métrica | Cobertos | % |
|---|---|---|
| Linhas | 841 / 868 | 96,88% |
| Comandos | 929 / 969 | 95,87% |
| Funções | 193 / 200 | 96,50% |
| Branches | 326 / 367 | 88,82% |

**Pontos com menos cobertura (decisão consciente):**
- `database/seed.ts` (83%): o trecho não coberto só roda quando o seed é chamado pela linha de comando (`npm run seed`). Os testes chamam o seed como função.
- `storage/s3-storage.service.ts` (89%): os testes usam um cliente S3 simulado, então o S3 real fica para a conferência manual na AWS (enviar e baixar um documento; ver pendências).
- `common/http-exception.filter.ts` (67% de branches): algumas mensagens padrão (ex.: 413 sem mensagem própria) só aparecem com erros raros do Express ou do Multer.
- DTOs e arquivos de query aparecem com 0% porque só têm declarações (decorators), sem linha executável.

## 4. Segurança

Casos detalhados: [`../seguranca/casos-de-seguranca.md`](../seguranca/casos-de-seguranca.md). São 50 casos (S01 a S50) organizados pelo OWASP Top 10, todos automatizados e passando.

**Novidades desta rodada:**

| Mudança | Por quê | Teste |
|---|---|---|
| `helmet`: HSTS, `nosniff`, CSP, `X-Frame-Options`, `Referrer-Policy`, sem `X-Powered-By` | Cabeçalhos de segurança padrão (OWASP A05) | S25–S27 |
| Limite de tentativas: 5/min por IP + conta e 30/min por IP no login do site, no login do app e no primeiro acesso | Força bruta na senha e na data de nascimento (OWASP A07) | S34–S39 |
| `TRUST_PROXY`: na AWS a API confia nos 2 proxies da frente (CloudFront + ALB) | Sem isso, o limite veria todos os usuários com o IP do load balancer | S37, S38 + `infra.test.ts` |
| Testes de CORS: origem liberada, origem estranha e preflight | Confirma que só o site configurado chama a API pelo navegador | S50 |

### Dependências (`npm audit`)

| Projeto | Antes | Ação | Depois |
|---|---|---|---|
| API (`backend/`) | 2 moderadas (`minimatch` dentro do `@nestjs/cli`, ferramenta de build) | `overrides` para o `minimatch` 11.0.4, que tem a correção; build e testes conferidos | **0** |
| Site (`frontend/`) | 1 alta (Vite 8.3.0–8.3.2, servidor de desenvolvimento) | `npm audit fix`: Vite 8.3.6; build conferido | **0** |
| Infra (`infra/`) | 2 moderadas (`minimatch` empacotado dentro do `aws-cdk-lib`) | Nenhuma: a correção não existe nem na versão mais nova do `aws-cdk-lib` (2.275.0), e o pacote vem empacotado (não aceita `overrides`) | **Risco aceito** |

Justificativa do risco aceito na infra:

- o `aws-cdk-lib` só roda na máquina de quem faz o deploy, na hora de gerar os templates;
- os padrões de arquivo que ele avalia são escritos por nós, nunca vêm de usuários;
- nada disso vai para a imagem da API.

Rever quando sair versão nova do `aws-cdk-lib`.

## 5. Desempenho e carga (linha de base local)

Cenário C01 do [roteiro de carga](../carga/README.md). Dados: [`carga-local-2026-11-05.json`](carga-local-2026-11-05.json).

| Cenário | Usuários | Duração | Requisições | Vazão | p50 | p95 | Máx. | Erros |
|---|---|---|---|---|---|---|---|---|
| C01 local, 1 processo | 10 | 60 s | 1.012 | 16,9 req/s | 599 ms | 664 ms | 839 ms | 0% |

**Leitura:**
- O login é limitado pela CPU, por causa do bcrypt, que é proposital para dificultar ataque às senhas. Um processo Node usa 1 núcleo, então a vazão fica perto de 17 logins/s, e o tempo de resposta cresce com a fila.
- A taxa estável (16,4 a 16,9 req/s em todas as janelas de 15 s) e o p95 constante mostram que não há vazamento de memória nem degradação durante o teste.
- Na AWS, cada tarefa tem só 0,25 vCPU, então uma tarefa deve atender bem menos que isso. É exatamente o que deve disparar o auto scaling no cenário C03.

Teste de fumaça na mesma API: **9 de 9 verificações** (API e banco, login do médico, prontuário, agenda, painel do gestor, login do app, carteira digital, perfil errado barrado, Swagger).

## 6. Pendências

| Item | Depende de | Responsável |
|---|---|---|
| C02–C04: carga e auto scaling na AWS, com prints do CloudWatch | Deploy na AWS (conta liberada em 05/11) | Matheus |
| Teste de fumaça contra a AWS e envio/download de um documento no S3 real | Deploy | Matheus |
| Roteiro manual do site (M01–M10) | Integração do site com a API (bloco 14) | Gustavo |
| Testes do app do paciente | App funcional | Equipe do app |

## 7. Defeitos

Nenhum defeito aberto nesta rodada. A falha encontrada durante a execução foi a documentação OpenAPI desatualizada depois de documentar o 429 nas rotas de login. Ela foi pega pelo teste `swagger.e2e-spec.ts` e corrigida regenerando o `docs/openapi.json`.
