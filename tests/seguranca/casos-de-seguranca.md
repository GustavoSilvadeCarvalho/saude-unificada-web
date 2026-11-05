# Casos de segurança

Testes de segurança da API, organizados pelo **OWASP Top 10 (2021)**. Todos são automatizados e rodam no CI a cada push, exceto os marcados como manuais.

Legenda dos arquivos (em `backend/test/` ou `infra/test/`):

| Arquivo | Assunto |
|---|---|
| `auth` | Login do site |
| `pat` | Pacientes |
| `atd` | Atendimentos |
| `doc` | Documentos |
| `reg` | Dados regionais |
| `app` | App do paciente |
| `seg` | Segurança |
| `sto` | Armazenamento |
| `upl` | Uploads |
| `cpf` | Regras de CPF |
| `infra` | Infraestrutura |

## A01 — Quebra de controle de acesso

| ID | Caso | Esperado | Teste | Resultado |
|---|---|---|---|---|
| S01 | Rota protegida sem token | 401 | `auth`, `pat`, `doc`, `reg` | ✅ |
| S02 | Gestor abre prontuário, atendimentos ou documentos | 403 | `pat`, `atd`, `doc` | ✅ |
| S03 | Médico abre o painel regional | 403 | `reg` | ✅ |
| S04 | Médico consulta a agenda de outro médico | 403 | `atd` | ✅ |
| S05 | Médico registra atendimento em nome de outro médico | 403 | `atd` | ✅ |
| S06 | Médico anexa documento em atendimento de outro médico | 403 | `doc` | ✅ |
| S07 | Paciente usa rotas de médico ou gestor | 403 | `app` | ✅ |
| S08 | Paciente baixa documento de outro paciente | Negado | `app` | ✅ |
| S09 | Médico usa as rotas `/me` do app | 403 | `app` | ✅ |
| S10 | Acesso negado não aparece como acesso no log de auditoria | Nada é registrado | `pat` | ✅ |
| S11 | Load balancer acessado direto, sem passar pelo CloudFront | 403 | `infra` | ✅ |

## A02 — Falhas criptográficas

| ID | Caso | Esperado | Teste | Resultado |
|---|---|---|---|---|
| S12 | Senha nunca aparece nas respostas (nem o hash bcrypt) | Sem `password`, `passwordHash` ou `$2` | `auth` | ✅ |
| S13 | Bucket dos documentos privado, criptografado e só com HTTPS | Bloqueio público + SSE + política de TLS | `infra` | ✅ |
| S14 | Arquivo gravado no S3 com criptografia no servidor | AES256 | `sto` | ✅ |
| S15 | CloudFront força HTTPS | Redireciona HTTP → HTTPS | `infra` | ✅ |
| S16 | Segredos (JWT, MongoDB) fora do código | Vêm do SSM Parameter Store | `infra` | ✅ |

## A03 — Injeção

| ID | Caso | Esperado | Teste | Resultado |
|---|---|---|---|---|
| S17 | Injeção NoSQL no login (`{ "$ne": null }` no e-mail) | 400 | `auth` | ✅ |
| S18 | Injeção NoSQL na URL do prontuário | 400 | `pat` | ✅ |
| S19 | Campos extras no corpo (ex.: listas do prontuário no cadastro) | Ignorados (`whitelist`) | `pat` | ✅ |
| S20 | Nome de arquivo com `../` ou caracteres de controle | Limpo antes de gravar | `upl`, `sto` | ✅ |

## A04 — Design inseguro

| ID | Caso | Esperado | Teste | Resultado |
|---|---|---|---|---|
| S21 | Login com e-mail inexistente e com senha errada | Mesma mensagem (não revela quais contas existem) | `auth`, `app` | ✅ |
| S22 | Primeiro acesso do paciente com data errada ou CPF sem prontuário | Mesma mensagem | `app` | ✅ |
| S23 | Painel do gestor sem nenhum dado pessoal (CPF, nome, id) | Só agregados | `reg` | ✅ |
| S24 | Atendimento recusado (agendamento de outro paciente) não grava nada pela metade | Prontuário e agenda intactos | `atd` | ✅ |

## A05 — Configuração incorreta de segurança

| ID | Caso | Esperado | Teste | Resultado |
|---|---|---|---|---|
| S25 | Cabeçalhos de segurança em toda resposta | `nosniff`, HSTS, CSP, `X-Frame-Options`, `Referrer-Policy` | `seg` | ✅ |
| S26 | Servidor não revela a tecnologia | Sem `X-Powered-By` | `seg` | ✅ |
| S27 | CSP não quebra o Swagger | Swagger abre sem script inline | `seg` | ✅ |
| S28 | Erros não vazam detalhes internos | Só `{ statusCode, message }` em português | Todos os arquivos `e2e` | ✅ |

## A06 — Componentes vulneráveis

| ID | Caso | Esperado | Resultado |
|---|---|---|---|
| S29 | `npm audit` da API | 0 vulnerabilidades | ✅ (05/11/2026) |
| S30 | `npm audit` do site | 0 vulnerabilidades | ✅ Vite atualizado para 8.3.6 |
| S31 | `npm audit` da infra | Sem vulnerabilidade em produção | ⚠️ Risco aceito (ver relatório) |

## A07 — Falhas de identificação e autenticação

| ID | Caso | Esperado | Teste | Resultado |
|---|---|---|---|---|
| S32 | Token inválido ou mal formado | 401 | `auth` | ✅ |
| S33 | Token assinado com outro segredo (adulterado) | 401 | `auth` | ✅ |
| S34 | Força bruta na mesma conta | 429 após 5 tentativas/min por IP + conta | `seg` | ✅ |
| S35 | Bloqueio vale até para a senha certa enquanto durar | 429 | `seg` | ✅ |
| S36 | Contornar o limite trocando maiúsculas do e-mail ou a máscara do CPF | Continua bloqueado | `seg` | ✅ |
| S37 | Um IP testando muitas contas (vazamento de senhas) | 429 após 30 tentativas/min por IP | `seg` | ✅ |
| S38 | Limite não atrapalha outro usuário no mesmo IP nem a mesma conta em outro IP | 200 | `seg` | ✅ |
| S39 | Primeiro acesso do paciente também limitado | 429 | `seg` | ✅ |
| S40 | Senha do paciente fraca, ou contendo CPF ou data de nascimento | 400 | `app` + `password.spec.ts` | ✅ |
| S41 | Paciente não entra pelo login do site (e-mail), só pelo do app (CPF) | 401 | `app` | ✅ |

## A08 — Falhas de integridade

| ID | Caso | Esperado | Teste | Resultado |
|---|---|---|---|---|
| S42 | Arquivo com nome `.pdf`, mas conteúdo de outro tipo | 400 (o tipo é conferido pelo conteúdo) | `doc`, `upl` | ✅ |
| S43 | Arquivo maior que 10 MB | 413 | `doc` | ✅ |
| S44 | Link de download adulterado ou expirado | Recusado | `doc`, `sto` | ✅ |
| S45 | Deploy com erro na AWS | Volta sozinho para a versão anterior (circuit breaker) | `infra` | ✅ |

## A09 — Falhas de log e monitoramento

| ID | Caso | Esperado | Teste | Resultado |
|---|---|---|---|---|
| S46 | Visualização de prontuário, cadastro, histórico e upload registrados (quem, o quê, quando) | Registro na auditoria | `pat`, `atd`, `doc` | ✅ |
| S47 | Paciente vê quem acessou o próprio prontuário | `/me/access-log` | `app` | ✅ |
| S48 | Alarmes de API fora do ar, erros 5xx, lentidão (p95 > 2 s) e CPU no limite | 4 alarmes com e-mail (SNS) | `infra` | ✅ |

## A10 — SSRF

Não se aplica: a API não busca URLs informadas pelo usuário.

## Fora do OWASP

| ID | Caso | Esperado | Teste | Resultado |
|---|---|---|---|---|
| S49 | CPF com dígito errado, de exemplo ou com 11 dígitos iguais | Recusado | `cpf`, `pat` | ✅ |
| S50 | CORS só libera as origens configuradas | Outras origens sem `Access-Control-Allow-Origin` | `seg` | ✅ |
