# Contrato da API — Saúde Unificada

Documento para alinhar o front-end web (e o app mobile) com o time do backend.
Os tipos TypeScript equivalentes estão em [`src/types/index.ts`](src/types/index.ts) e as chamadas em [`src/services/api.ts`](src/services/api.ts).

## Convenções gerais

| Item | Padrão |
|---|---|
| URL base | Configurada em `VITE_API_URL` (ex.: `http://localhost:3000/api`) |
| Formato | JSON (`Content-Type: application/json`), exceto upload de arquivos (`multipart/form-data`) |
| Autenticação | `Authorization: Bearer <token>` em todas as rotas, exceto `POST /auth/login` |
| Nomes de campos | camelCase, em inglês (glossário no fim do documento) |
| CPF | Sempre **só dígitos**, 11 caracteres (ex.: `"12345678909"`). A máscara é feita no front |
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

- `role`: `"medico"` | `"gestor"` (pacientes usam apenas o app).
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
  "cpf": "12345678909",
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
  "cpf": "11144477735",
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
  "patientCpf": "12345678909",
  "patientName": "Maria Aparecida da Silva",
  "doctorId": "u-medico-1",
  "doctorName": "Dr. Rafael Moreira Lima",
  "date": "2026-10-02T12:00:00.000Z",
  "status": "agendado",
  "reason": "Retorno — controle glicêmico",
  "summary": "",
  "documents": [
    { "id": "doc-1", "fileName": "receita.pdf", "type": "receita", "uploadedAt": "2026-10-01T14:40:00.000Z" }
  ]
}
```

- `status`: `"realizado"` | `"agendado"`
- `documents[].type`: `"receita"` | `"laudo"` | `"exame"` | `"outro"`

### `GET /appointments?doctorId=:id`

Lista os atendimentos (agendados e realizados) do médico. Ordem: data crescente. O front separa "próximos" (`agendado`) e "passados" (`realizado`).

### `GET /appointments?patientCpf=:cpf`

Lista os atendimentos do paciente (de todos os médicos). Ordem: data decrescente. Usado para a lista de documentos e agendamentos no prontuário.

### `POST /appointments`

Registra um atendimento **e atualiza o prontuário** na mesma operação (idealmente em uma transação).

Requisição:

```json
{
  "scheduledAppointmentId": "at-101",
  "patientCpf": "12345678909",
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

- `scheduledAppointmentId` (opcional): se informado, o backend **atualiza** esse agendamento (status, data, resumo) em vez de criar outro.
- Itens de `newAllergies`, `newMedications` e `newConditions` são **adicionados** às listas do paciente (o backend gera os `id`).
- Com `status: "agendado"` as três listas chegam vazias e `summary` pode ser vazio.

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

Sugestão: documentos do tipo `laudo` ou `exame` também geram uma entrada em `exams` do paciente (o mock faz isso).

---

## 4. Dados regionais (gestor)

Rotas acessíveis apenas ao perfil `gestor`. Os dados são **agregados e anônimos** (sem CPF ou nome).

### `GET /regions`

```json
["Grande São Paulo", "Campinas", "Baixada Santista", "Vale do Paraíba", "Sorocaba", "Ribeirão Preto"]
```

### `GET /regional-data?region=&from=&to=`

Todos os parâmetros são opcionais:

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

Os indicadores e gráficos (totais, média mensal, ranking de condições, evolução mensal) são calculados no front a partir dessa lista.

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
| `documents` | documentos anexados |
| `role` | perfil (`medico` \| `gestor`) |
| `specialty` | especialidade |
| `uniquePatients` | pacientes únicos atendidos no mês |
