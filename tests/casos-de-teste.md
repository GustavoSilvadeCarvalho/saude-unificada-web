# Casos de teste — Saúde Unificada

| Item | Valor |
|---|---|
| Sistema | Saúde Unificada: API (NestJS + MongoDB), site (React) e app do paciente |
| Versão | Branch `feat/backend-api`, 09/11/2026 |
| Responsável | Matheus Henrique Vieira Neves |
| Ambientes | **Local:** API com MongoDB em memória (`npm run dev:memory`) e site em `localhost:5173`. **AWS:** us-east-1, CloudFront + ALB + ECS Fargate, MongoDB Atlas, S3 |
| Dados | Seed de demonstração: 7 usuários, 18 pacientes, 34 atendimentos, 5 contas no app (ver o [README](../README.md)) |

**Legenda**
- **Tipo:** **A** = automatizado (roda no GitHub Actions a cada push); **M** = manual (executado no navegador ou na AWS).
- **Situação:** ✅ passou · ❌ falhou · ⚠️ passou com ressalva.

## 1. Resumo

| Módulo | Casos | ✅ | ❌ | ⚠️ |
|---|---|---|---|---|
| Autenticação | 6 | 6 | 0 | 0 |
| Prontuário (pacientes) | 6 | 6 | 0 | 0 |
| Atendimentos | 6 | 6 | 0 | 0 |
| Documentos e verificação | 6 | 6 | 0 | 0 |
| Privacidade (bloqueio de médico) | 5 | 5 | 0 | 0 |
| App do paciente | 5 | 5 | 0 | 0 |
| Painel do gestor | 3 | 3 | 0 | 0 |
| Site integrado com a API | 6 | 6 | 0 | 0 |
| Não funcionais (segurança, nuvem, carga) | 8 | 7 | 0 | 1 |
| **Total** | **51** | **50** | **0** | **1** |

| Execução automatizada (09/11/2026) | Valor |
|---|---|
| Testes da API | **231 de 231 passando**, em 14 arquivos |
| Cobertura de linhas (última medição, 05/11) | 96,9% |
| Tempo da suíte | ~10 s |

Testes por arquivo (`backend/test/`):

| Arquivo | Testes | Arquivo | Testes |
|---|---|---|---|
| `patients.e2e-spec.ts` | 37 | `security.e2e-spec.ts` | 17 |
| `appointments.e2e-spec.ts` | 30 | `password.spec.ts` | 15 |
| `patient-app.e2e-spec.ts` | 26 | `regional.e2e-spec.ts` | 15 |
| `documents.e2e-spec.ts` | 23 | `auth.e2e-spec.ts` | 12 |
| `cpf.spec.ts` | 19 | `privacy.e2e-spec.ts` | 11 |
| `storage.spec.ts` | 9 | `uploads.spec.ts` | 8 |
| `swagger.e2e-spec.ts` | 5 | `health.e2e-spec.ts` | 4 |

## 2. Autenticação

| ID | Cenário | Pré-condição | Entrada | Resultado esperado | Resultado obtido | Tipo | Situação |
|---|---|---|---|---|---|---|---|
| CT01 | Login do médico no site | Usuário do seed | `medico@teste.com` / `123456` | 200 com token e dados do médico (CRM, especialidade) | 200, token JWT e perfil `medico` | A | ✅ |
| CT02 | Login com senha errada | — | `medico@teste.com` / `errada` | 401 "E-mail ou senha inválidos." | 401 com a mensagem esperada | A | ✅ |
| CT03 | E-mail inexistente devolve a mesma mensagem | — | `ninguem@teste.com` | 401 igual ao CT02 (não revela quem tem conta) | Mensagem idêntica | A | ✅ |
| CT04 | Login do paciente no app pelo CPF (estilo gov.br) | Conta da Maria | CPF `229.169.264-02` / `paciente123` | 200 com perfil `paciente` e o CPF | 200, aceita CPF com e sem máscara | A | ✅ |
| CT05 | Primeiro acesso do paciente | Ana sem conta | CPF + data de nascimento + senha nova | 201 e já entra; senha fraca ou com o CPF é recusada | 201; senhas fracas → 400 com o motivo | A | ✅ |
| CT06 | Força bruta no login | Limite ligado | 6 tentativas em 1 min, mesma conta | 429 a partir da 6ª, até com a senha certa | 429 "Muitas tentativas..." | A | ✅ |

## 3. Prontuário (pacientes)

| ID | Cenário | Pré-condição | Entrada | Resultado esperado | Resultado obtido | Tipo | Situação |
|---|---|---|---|---|---|---|---|
| CT07 | Médico abre o prontuário unificado | Logado como médico | `GET /patients/22916926402` | Alergias, remédios, cirurgias, exames, condições e resumo dos atendimentos | 200 com todas as seções | A | ✅ |
| CT08 | Acesso fica registrado (LGPD) | — | Abrir o prontuário | Registro na auditoria com quem, o quê e quando | 1 registro `patient.view` | A | ✅ |
| CT09 | CPF inválido | — | 11 dígitos iguais e dígito verificador errado | 400 com o motivo | 400 | A | ✅ |
| CT10 | Cadastro de paciente novo | Médico | CPF válido, nome, nascimento, tipo sanguíneo, região | 201 e prontuário vazio pronto para atendimento | 201 | A | ✅ |
| CT11 | Cadastro com CPF repetido | Paciente existe | Mesmo CPF | 409 | 409 | A | ✅ |
| CT12 | Gestor tenta abrir prontuário | Logado como gestor | `GET /patients/:cpf` | 403 (gestor só vê dados agregados) | 403 | A | ✅ |

## 4. Atendimentos

| ID | Cenário | Pré-condição | Entrada | Resultado esperado | Resultado obtido | Tipo | Situação |
|---|---|---|---|---|---|---|---|
| CT13 | Agenda do médico | Seed | `GET /appointments?doctorId=` | Passados e próximos, em ordem de data | 8 atendimentos, 4 agendados | A | ✅ |
| CT14 | Registrar atendimento atualiza o prontuário | Médico | Resumo + alergia + remédio + condição | 201; os itens novos aparecem no prontuário | 201 e prontuário atualizado | A | ✅ |
| CT15 | Falha no meio não grava nada pela metade | Agendamento de outro paciente | `scheduledAppointmentId` errado | 400 e prontuário intacto (transação) | 400, nada gravado | A | ✅ |
| CT16 | Agendar com orientações ao paciente | Médico | `status: agendado`, `instructions: "Trazer a adrenalina..."` | 201 com as orientações (sem espaços sobrando) | 201 | A | ✅ |
| CT17 | Atendimento realizado com data futura | — | Data de amanhã | 400 "não pode ter data no futuro" | 400 | A | ✅ |
| CT18 | Médico registra em nome de outro | — | `doctorId` da Dra. Camila | 403 | 403 | A | ✅ |

## 5. Documentos e verificação de autenticidade

| ID | Cenário | Pré-condição | Entrada | Resultado esperado | Resultado obtido | Tipo | Situação |
|---|---|---|---|---|---|---|---|
| CT19 | Anexar receita em PDF | Atendimento do médico | PDF de 1 KB, `type: receita` | 201 com código de verificação (`XXXX-XXXX-XXXX`) e SHA-256 | 201; códigos únicos; SHA-256 confere | A | ✅ |
| CT20 | Arquivo disfarçado | — | `.exe` renomeado para `.pdf` | 400 (o tipo é conferido pelo conteúdo) | 400 | A | ✅ |
| CT21 | Arquivo grande | — | 11 MB | 413 | 413 | A | ✅ |
| CT22 | Download pelo link temporário | Documento anexado | `GET .../download` e abrir a URL | Arquivo idêntico ao enviado; link vale 5 min | Bytes iguais; no S3 real também (05/11) | A + M | ✅ |
| CT23 | Farmácia confere a receita sem login | Código impresso | `GET /verify/<código>` | Médico, CRM, data e só as **iniciais** do paciente, sem CPF | 200, "J. P. O. S.", sem CPF | A | ✅ |
| CT24 | Código digitado de outro jeito ou inexistente | — | minúsculas, sem traço, com `O` no lugar de `0`; `ZZZZ-ZZZZ-ZZZZ` | Aceita a variação; inexistente → 404 | Como esperado | A | ✅ |

## 6. Privacidade (o paciente controla quem acessa)

| ID | Cenário | Pré-condição | Entrada | Resultado esperado | Resultado obtido | Tipo | Situação |
|---|---|---|---|---|---|---|---|
| CT25 | Paciente vê os médicos ligados a ele | Login da Maria no app | `GET /me/doctors` | Lista quem atendeu e quem abriu o prontuário | Dr. Rafael listado, `blocked: false` | A | ✅ |
| CT26 | Paciente bloqueia um médico | — | `PUT /me/blocked-doctors/<Rafael>` | Rafael recebe 403 no prontuário, no histórico, nos documentos e ao registrar atendimento | 403 "O paciente bloqueou o seu acesso..." em todos | A | ✅ |
| CT27 | Os outros médicos não são afetados | Rafael bloqueado | Dra. Camila abre o prontuário | 200 | 200 | A | ✅ |
| CT28 | Paciente libera de novo | Rafael bloqueado | `DELETE /me/blocked-doctors/<Rafael>` | Acesso volta ao normal | 200 | A | ✅ |
| CT29 | Bloquear quem não é médico | — | id do gestor ou id inexistente | 404 "Médico não encontrado." | 404 | A | ✅ |

## 7. App do paciente

| ID | Cenário | Pré-condição | Entrada | Resultado esperado | Resultado obtido | Tipo | Situação |
|---|---|---|---|---|---|---|---|
| CT30 | Carteira digital | Login da Maria | `GET /me/record` | O próprio prontuário, só leitura | 200 | A | ✅ |
| CT31 | Próximos atendimentos com orientações | — | `GET /me/appointments?status=agendado` | Lista com as orientações de preparo | "Jejum de 8 horas..." | A | ✅ |
| CT32 | Quem acessou meus dados | Médico abriu o prontuário | `GET /me/access-log` | Registro com nome do médico e data | Registro presente | A | ✅ |
| CT33 | Baixar documento de outra pessoa | — | id de documento do João | Negado como se não existisse | 404 | A | ✅ |
| CT34 | Paciente usa rota de médico | — | `GET /patients/:cpf` com token de paciente | 403 | 403 | A | ✅ |

## 8. Painel do gestor

| ID | Cenário | Pré-condição | Entrada | Resultado esperado | Resultado obtido | Tipo | Situação |
|---|---|---|---|---|---|---|---|
| CT35 | Dados por região e período | Logado como gestor | `region=Campinas&from=2026-01&to=2026-06` | Só agregados (sem CPF, nome ou id) | 200, só agregados | A | ✅ |
| CT36 | Período invertido | — | `from` depois de `to` | 400 com a mensagem | 400 | A | ✅ |
| CT37 | Médico tenta abrir o painel | — | `GET /regional-data` | 403 | 403 | A | ✅ |

## 9. Site integrado com a API (manual, 09/11/2026)

Executado no navegador com a API em memória e o site em `localhost:5173` (`VITE_USE_MOCK=false`).

| ID | Cenário | Passos | Resultado esperado | Resultado obtido | Tipo | Situação |
|---|---|---|---|---|---|---|
| CT38 | Login do médico pelo site | Abrir `/login`, entrar com `medico@teste.com` | Vai para "Meu registro" com dados da API | 4 próximos, 4 realizados, 5 pacientes | M | ✅ |
| CT39 | Prontuário no site | Abrir a Maria | Todas as seções, orientações do agendamento e código de verificação | Tudo exibido | M | ✅ |
| CT40 | Abrir documento pelo site | Clicar em **Abrir** no documento | API devolve o link e o PDF abre | Link 200; PDF de 996 bytes (`%PDF-1.4`) | M | ✅ |
| CT41 | Registrar atendimento pelo formulário | Ortopedista → Roberto → preencher e salvar | Mensagem de sucesso e prontuário atualizado | "Atendimento registrado e prontuário atualizado." | M | ✅ |
| CT42 | Painel do gestor no site | Entrar com `gestor@teste.com` | Indicadores e gráficos com dados da API | 214.527 atendimentos em 6 meses, gráficos por região | M | ✅ |
| CT43 | Usuários de teste na tela de login | Abrir `/login` | Lista com botão **Preencher** (médicos novos inclusos) | Exibida | M | ✅ |

## 10. Não funcionais (segurança, nuvem e carga)

| ID | Cenário | Entrada | Resultado esperado | Resultado obtido | Tipo | Situação |
|---|---|---|---|---|---|---|
| CT44 | Cabeçalhos de segurança | Qualquer resposta | HSTS, `nosniff`, CSP, sem `X-Powered-By` | Presentes, também na AWS | A + M | ✅ |
| CT45 | CORS | Origem não autorizada | Sem `Access-Control-Allow-Origin` | Bloqueada | A | ✅ |
| CT46 | Acesso direto ao load balancer, sem o CloudFront | `http://<alb>/api/health` | 403 | 403 | M | ✅ |
| CT47 | HTTP vira HTTPS | `http://<cloudfront>/api/health` | 301 para HTTPS | 301 | M | ✅ |
| CT48 | Teste de fumaça na AWS | `smoke-test.mjs` | 9 de 9 | 9 de 9 | M | ✅ |
| CT49 | Auto scaling sob carga | 20 usuários fazendo login por 10 min | Sobe para pelo menos 2 tarefas e volta para 1 depois | 1 → 2 → 3 e volta para 1 (~20 min depois) | M | ✅ |
| CT50 | Taxa de erro sob carga | Mesma carga | < 1% | **Antes da correção:** 1,1% a 3,1% (502 do load balancer). **Depois:** 0% em 3.659 requisições | M | ✅ |
| CT51 | Tempo de resposta com 3 tarefas | Mesma carga | p95 menor que com 1 tarefa | p50 caiu de 7,3 s para ~1 s, mas o p95 ficou alto (~8,5 s) | M | ⚠️ |

Detalhes do CT49 a CT51 e o custo para crescer: [`relatorios/escalabilidade-e-custo.md`](relatorios/escalabilidade-e-custo.md).

## 11. Defeitos encontrados

| ID | Defeito | Caso | Correção | Situação |
|---|---|---|---|---|
| D1 | Swagger (`docs/openapi.json`) desatualizado depois de mudar uma rota | Teste do Swagger | Regenerado com `npm run openapi` | Corrigido |
| D2 | Erros 502 sob carga na AWS | CT50 | API segura a conexão por 65 s, mais que os 60 s do load balancer | Corrigido |
| D3 | Testes de atendimento falhando das 21h à meia-noite | Suíte da API | Teste passou a usar a data de Brasília, igual à API | Corrigido |
| D4 | Carga desigual entre as tarefas (p95 alto com 3 tarefas) | CT51 | Proposta: balanceamento `least_outstanding_requests` no load balancer | Em aberto |
