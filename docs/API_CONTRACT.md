# Contrato da API — Saúde Unificada

Documento para alinhar o front-end web (e o app mobile) com o time do backend.
Os tipos TypeScript equivalentes estão em [`frontend/src/types/index.ts`](../frontend/src/types/index.ts) e as chamadas em [`frontend/src/services/api.ts`](../frontend/src/services/api.ts). A implementação fica em [`backend/`](../backend).

## Convenções gerais

| Item | Padrão |
|---|---|
| URL base | Configurada em `VITE_API_URL` (ex.: `http://localhost:3000/api`) |
| Formato | JSON (`Content-Type: application/json`), exceto upload de arquivos (`multipart/form-data`) |
| Autenticação | `Authorization: Bearer <token>` em todas as rotas, exceto `POST /auth/login` |
| Nomes de campos | camelCase, em inglês (glossário no fim do documento) |
| CPF | Sempre **só dígitos**, 11 caracteres (ex.: `"22916926402"`). A máscara é feita no front. A API recusa (400) CPF com dígitos verificadores errados, com os 11 dígitos iguais ou que seja um CPF de exemplo conhecido (`12345678909`, `11144477735`...) |
| Datas | `AAAA-MM-DD` para datas (ex.: nascimento); ISO 8601 completo para data/hora (ex.: `"2026-10-01T14:30:00.000Z"`) |
| Mês (dados regionais) | `AAAA-MM` |
| IDs | string |
| CORS | Liberar a origem do front (ex.: `http://localhost:5173` e o domínio da Vercel) |

### Formato de erro

Qualquer resposta com status 4xx/5xx deve trazer uma mensagem legível, que o front exibe ao usuário:

```json
{ "message": "E-mail ou senha inválidos." }
```

| Status | Uso esperado |
|---|---|
| 400 | Dados inválidos |
| 401 | Sem token, token inválido ou login incorreto |
| 403 | Perfil sem permissão (ex.: gestor acessando prontuário) |
| 404 | Recurso não encontrado (**obrigatório** em `GET /patients/:cpf` quando o CPF não existe) |
| 409 | Conflito (ex.: CPF já cadastrado) |

---

## 1. Autenticação

### `POST /auth/login`

Requisição:

```json
{ "email": "medico@teste.com", "password": "123456" }
```

Resposta `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "u-medico-1",
    "name": "Dr. Rafael Moreira Lima",
    "email": "medico@teste.com",
    "role": "medico",
    "crm": "CRM-SP 123456",
    "specialty": "Clínica Médica",
    "phone": "(11) 3456-7890",
    "institution": "UBS Vila Mariana"
  }
}
```

- `role`: `"medico"` | `"gestor"` (pacientes usam o app e entram pelo CPF: ver seção 5).
- `crm` e `specialty` só existem para médicos.
- A senha **nunca** deve vir na resposta.
- Erro: `401` com `{ "message": "E-mail ou senha inválidos." }`.

---

## 2. Pacientes

### `GET /patients/:cpf`

Retorna o prontuário unificado. **`404` se o CPF não existir** (o front usa isso para oferecer o cadastro).

Resposta `200`:

```json
{
  "cpf": "22916926402",
  "fullName": "Maria Aparecida da Silva",
  "birthDate": "1958-03-14",
  "sex": "F",
  "bloodType": "O-",
  "phone": "(11) 98765-4321",
  "email": "maria.silva@email.com",
  "region": "Grande São Paulo",
  "allergies": [
    { "id": "al-1", "substance": "Penicilina", "severity": "grave", "reaction": "Anafilaxia", "recordedAt": "2015-06-02" }
  ],
  "activeMedications": [
    { "id": "md-1", "name": "Losartana potássica", "dosage": "50 mg", "frequency": "1x ao dia", "startDate": "2018-04-10", "prescribedBy": "Dr. Rafael Moreira Lima" }
  ],
  "procedures": [
    { "id": "pr-1", "name": "Colecistectomia videolaparoscópica", "date": "2016-09-12", "location": "Hospital das Clínicas - SP", "notes": "Sem intercorrências" }
  ],
  "exams": [
    { "id": "ex-1", "name": "Hemoglobina glicada (HbA1c)", "date": "2026-07-18", "result": "7,1% — acima da meta", "fileName": "hba1c_jul2026.pdf" }
  ],
  "clinicalConditions": [
    { "id": "cc-1", "name": "Hipertensão arterial sistêmica", "cid": "I10", "diagnosedAt": "2018-04-10", "status": "controlada" }
  ],
  "appointmentSummaries": [
    { "appointmentId": "at-001", "date": "2026-08-02T12:00:00.000Z", "doctorName": "Dr. Rafael Moreira Lima", "specialty": "Clínica Médica", "summary": "PA 132/84 mmHg..." }
  ]
}
```

Valores fixos:

- `sex`: `"F"` | `"M"` | `"Outro"`
- `bloodType`: `"A+"` | `"A-"` | `"B+"` | `"B-"` | `"AB+"` | `"AB-"` | `"O+"` | `"O-"` | `"Não informado"`
- `allergies[].severity`: `"leve"` | `"moderada"` | `"grave"`
- `clinicalConditions[].status`: `"ativa"` | `"controlada"` | `"resolvida"`
- `appointmentSummaries`: somente atendimentos com status `realizado`, do mais recente para o mais antigo.
- Campos opcionais: `phone`, `email`, `reaction`, `prescribedBy`, `location`, `notes`, `fileName`, `cid`, `specialty`.

### `POST /patients`

Requisição:

```json
{
  "cpf": "81646027876",
  "fullName": "Fulano de Tal",
  "birthDate": "1990-05-10",
  "sex": "M",
  "bloodType": "Não informado",
  "phone": "(19) 99999-0000",
  "email": "fulano@email.com",
  "region": "Campinas"
}
```

Resposta `201`: o `Patient` completo (com as listas vazias).
Erros: `400` (CPF inválido, campos obrigatórios), `409` (CPF já cadastrado).

---

## 3. Atendimentos

Objeto `Appointment`:

```json
{
  "id": "at-101",
  "patientCpf": "22916926402",
  "patientName": "Maria Aparecida da Silva",
  "doctorId": "u-medico-1",
  "doctorName": "Dr. Rafael Moreira Lima",
  "date": "2026-10-02T12:00:00.000Z",
  "status": "agendado",
  "reason": "Retorno — controle glicêmico",
  "summary": "",
  "instructions": "Jejum de 8 horas. Trazer o resultado da HbA1c.",
  "documents": [
    { "id": "doc-1", "fileName": "receita.pdf", "type": "receita", "uploadedAt": "2026-10-01T14:40:00.000Z" }
  ]
}
```

- `status`: `"realizado"` | `"agendado"`
- `instructions` (opcional): orientações para o paciente antes do atendimento (jejum, preparo, o que levar). Aparece no app em "Próximos atendimentos".
- `documents[].type`: `"receita"` | `"laudo"` | `"exame"` | `"outro"`

Todas as rotas de atendimento são só do perfil `medico` (gestor recebe `403`).

### `GET /appointments?doctorId=:id`

Lista os atendimentos (agendados e realizados) do médico. Ordem: data crescente. O front separa "próximos" (`agendado`) e "passados" (`realizado`).
Só o próprio médico: `doctorId` de outro médico dá `403`. Sem filtro, ou com `doctorId` e `patientCpf` juntos: `400`.

### `GET /appointments?patientCpf=:cpf`

Lista os atendimentos do paciente (de todos os médicos). Ordem: data decrescente. Usado para a lista de documentos e agendamentos no prontuário. O acesso é registrado na auditoria.

### `POST /appointments`

Registra um atendimento **e atualiza o prontuário** na mesma operação (idealmente em uma transação).

Requisição:

```json
{
  "scheduledAppointmentId": "at-101",
  "patientCpf": "22916926402",
  "doctorId": "u-medico-1",
  "date": "2026-10-01T14:30:00.000Z",
  "status": "realizado",
  "reason": "Retorno — controle glicêmico",
  "summary": "Paciente estável, glicemia em melhora. Mantida conduta.",
  "newAllergies": [
    { "substance": "Ibuprofeno", "severity": "moderada", "reaction": "Urticária", "recordedAt": "2026-10-01" }
  ],
  "newMedications": [
    { "name": "Amoxicilina", "dosage": "500 mg", "frequency": "8 em 8 horas", "startDate": "2026-10-01", "prescribedBy": "Dr. Rafael Moreira Lima" }
  ],
  "newConditions": [
    { "name": "Sinusite aguda", "cid": "J01", "status": "ativa", "diagnosedAt": "2026-10-01" }
  ]
}
```

Regras:

- `scheduledAppointmentId` (opcional): se informado, o backend **atualiza** esse agendamento (status, data, resumo) em vez de criar outro. Sem `reason` novo, mantém o do agendamento. Com `status: "agendado"`, remarca.
- Itens de `newAllergies`, `newMedications` e `newConditions` são **adicionados** às listas do paciente (o backend gera os `id`). `prescribedBy` vazio vira o nome do médico. CID gravado em maiúsculas.
- Com `status: "agendado"` as três listas chegam vazias e `summary` pode ser vazio.
- `instructions` (opcional, até 1000 caracteres): orientações para o paciente. Ao concluir ou remarcar sem enviar, mantém as do agendamento.
- Atendimento, prontuário e auditoria são gravados numa **transação** (tudo ou nada).

Regras (as mesmas do formulário do site; violá-las dá `400` com a mensagem):

| Regra | Mensagem |
|---|---|
| `doctorId` tem que ser o do médico logado | `403` Você só pode registrar atendimentos em seu próprio nome. |
| Realizado não pode ter data no futuro (folga de 5 min) | Um atendimento realizado não pode ter data no futuro. |
| Realizado precisa de resumo com 10+ caracteres | Descreva o atendimento (mínimo de 10 caracteres). |
| Agendado precisa de data no futuro | Um agendamento precisa ter data no futuro. |
| Agendado não muda o prontuário | Um agendamento não altera o prontuário: ... |
| `date` em ISO 8601 | Data e hora inválidas. Use o formato ISO 8601. |
| CID no formato CID-10 (ex.: `I10`, `J45.0`) | Condição 1: CID inválido. ... |

Erros dentro das listas dizem qual item: `"Alergia 2: Informe a substância da alergia."`.
Outros erros: `404` paciente ou agendamento não encontrado; `403` agendamento de outro médico; `400` agendamento de outro paciente; `409` agendamento já registrado.

Resposta `201`: o `Appointment` criado/atualizado (com `documents` como array, mesmo que vazio).

### `POST /appointments/:id/documents`

Upload de receita/laudo. **`multipart/form-data`**, um arquivo por requisição (o front envia em sequência logo após criar o atendimento).

| Campo | Tipo | Descrição |
|---|---|---|
| `file` | arquivo | PDF, JPG ou PNG |
| `type` | texto | `receita` \| `laudo` \| `exame` \| `outro` |

Resposta `201`:

```json
{ "id": "doc-9", "fileName": "receita_amoxicilina.pdf", "type": "receita", "uploadedAt": "2026-10-01T14:41:00.000Z" }
```

Regras:

- Aceita só **PDF, JPG e PNG**, conferidos pelo **conteúdo** do arquivo (um `.exe` renomeado para `.pdf` é recusado): `400` "Formato não aceito. Envie PDF, JPG ou PNG.".
- Até **10 MB**: acima disso, `413` "Arquivo muito grande. O limite é de 10 MB.".
- Só o **médico do atendimento** pode enviar (`403`); até 20 documentos por atendimento.
- Nome com acento é mantido (`laudo_cardiológico.pdf`).
- `laudo` e `exame` também geram uma entrada em `exams` do paciente (`name: "Laudo anexado"` ou `"Exame anexado"`, `result: "Ver arquivo anexado"`), com `appointmentId` e `documentId` para baixar o arquivo.

### `GET /appointments/:id/documents/:documentId/download`

Link temporário para baixar o arquivo. Qualquer médico pode pedir (o prontuário é unificado); cada pedido fica na auditoria.

Resposta `200`:

```json
{ "url": "https://...", "expiresAt": "2026-10-01T14:46:00.000Z" }
```

- A `url` vale **5 minutos** e **não precisa do token**: é só abrir (`window.open(url)` no site, `Linking.openURL(url)` no app).
- Em produção é uma URL pré-assinada do S3 (o arquivo vai direto do S3 para o usuário). Em desenvolvimento é um link assinado da própria API (`/api/files/...`).
- `404` se o atendimento ou o documento não existir.

---

## 4. Dados regionais (gestor)

Os dados são **agregados e anônimos** (sem CPF, nome ou id).

### `GET /regions`

Perfis `gestor` **e** `medico` (o formulário de cadastro de paciente usa a lista). Ordem de exibição definida na coleção `regions`; o `region` do `POST /patients` precisa ser uma delas (`400` "Região inválida.").

```json
["Grande São Paulo", "Campinas", "Baixada Santista", "Vale do Paraíba", "Sorocaba", "Ribeirão Preto"]
```

### `GET /regional-data?region=&from=&to=`

Só o perfil `gestor` (`403` para médico). Todos os parâmetros são opcionais:

| Parâmetro | Formato | Descrição |
|---|---|---|
| `region` | texto | Filtra uma região (vazio = todas) |
| `from` | `AAAA-MM` | Mês inicial (inclusive) |
| `to` | `AAAA-MM` | Mês final (inclusive) |

Resposta `200`: uma linha por região por mês.

```json
[
  {
    "region": "Campinas",
    "month": "2026-09",
    "appointments": 6120,
    "uniquePatients": 4010,
    "conditions": [
      { "name": "Hipertensão", "count": 1020 },
      { "name": "Infecções respiratórias", "count": 760 }
    ]
  }
]
```

- Ordem: por região e depois por mês. Cada linha tem só `region`, `month`, `appointments`, `uniquePatients` e `conditions` (da maior contagem para a menor).
- Erros `400`: mês fora do formato (`"Mês inicial inválido. Use o formato AAAA-MM."`), `from` depois de `to` (`"O mês inicial não pode ser depois do mês final."`) ou região inexistente (`"Região inválida."`).

Os indicadores e gráficos (totais, média mensal, ranking de condições, evolução mensal) são calculados no front a partir dessa lista.

---

## 5. Paciente (app)

O paciente entra **pelo CPF**, como no app do gov.br. O token dele só abre as rotas desta seção (`403` nas outras), e tudo é **somente leitura**: quem atualiza o prontuário é o profissional, no atendimento.

### `POST /auth/patient-login` (público)

```json
{ "cpf": "22916926402", "password": "paciente123" }
```

Resposta `200`: igual ao login do site, com `user.role = "paciente"` e `user.cpf` (sem `email`). CPF com ou sem máscara.
Erro: `401` "CPF ou senha inválidos." (mesma mensagem para CPF sem conta e senha errada).

### `POST /auth/patient-register` (público) — primeiro acesso

```json
{ "cpf": "50717927296", "birthDate": "1996-11-05", "password": "meuApp2026" }
```

- CPF + data de nascimento precisam bater com o prontuário (criado pelo médico no primeiro atendimento). Se não baterem: `400` "Não encontramos um cadastro com esse CPF e essa data de nascimento. ..." (mesma mensagem para CPF sem prontuário e data errada).
- Senha: 8 a 64 caracteres, com letras e números; não pode ser uma senha comum nem conter o CPF ou a data de nascimento (`400` com o motivo).
- CPF que já tem conta: `409` "Este CPF já tem conta. Use a opção Entrar.".
- Resposta `201`: `{ token, user }` (já entra).

### Rotas do paciente logado

| Rota | Tela do app | Resposta |
|---|---|---|
| `GET /me/record` | Carteira Digital de Saúde | `Patient` (mesmo formato de `GET /patients/:cpf`) |
| `GET /me/appointments?status=realizado` | Histórico (o que já fez) | `Appointment[]`, mais recente primeiro |
| `GET /me/appointments?status=agendado` | Atendimentos (o que vai fazer) | `Appointment[]`, mais próximo primeiro |
| `GET /me/exams` | Exames e resultados | `ExamReport[]`, mais recente primeiro |
| `GET /me/access-log` | Quem acessou meus dados (LGPD) | `[{ at, description, userName, userRole, action }]` |
| `GET /me/appointments/:id/documents/:documentId/download` | Baixar receita/laudo | `{ url, expiresAt }` (link de 5 min, sem token) |

Exemplo de `GET /me/access-log`:

```json
[
  { "at": "2026-10-01T14:30:00.000Z", "description": "Abriu o seu prontuário", "userName": "Dr. Rafael Moreira Lima", "userRole": "medico", "action": "patient.view" }
]
```

---

## Glossário (campo → significado)

| Campo | Significado |
|---|---|
| `fullName` | nome completo |
| `birthDate` | data de nascimento |
| `bloodType` | tipo sanguíneo |
| `allergies` | alergias |
| `activeMedications` | medicamentos ativos |
| `procedures` | procedimentos |
| `exams` | exames / laudos |
| `clinicalConditions` | condições clínicas |
| `appointmentSummaries` | resumo de atendimentos |
| `patientCpf` | CPF do paciente |
| `doctorId` | id do médico |
| `reason` | motivo da consulta |
| `summary` | resumo do atendimento |
| `instructions` | orientações para o paciente antes do atendimento |
| `documents` | documentos anexados |
| `role` | perfil (`medico` \| `gestor` \| `paciente`) |
| `specialty` | especialidade |
| `uniquePatients` | pacientes únicos atendidos no mês |
