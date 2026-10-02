# Saúde Unificada — Web

Front-end web da plataforma de **prontuário unificado de saúde**, integrada pelo CPF do paciente.
Projeto Integrador do curso de Desenvolvimento de Software Multiplataforma (DSM).

A plataforma tem três partes:

- **Web** (este repositório): usado por **profissionais de saúde** e **gestores públicos**.
- **App mobile**: usado pelos **pacientes** (o site só tem o botão para baixar o app).
- **API backend**: compartilhada pelo web e pelo app.

Como o backend ainda está em desenvolvimento, o front funciona com **dados mockados**, mas toda a comunicação passa por uma camada única de API. Para usar a API real, basta mudar a configuração (veja [Trocar o mock pela API real](#trocar-o-mock-pela-api-real)).

## Funcionalidades

**Site institucional** (`/`)
- Hero, Proposta de Valor, Prova Social, Showroom + Primeiros Passos, Para Quem É, CTA, FAQ (accordion) e Suporte
- Header com âncoras para as seções e menu mobile

**Login** (`/login`)
- E-mail e senha, com redirecionamento por perfil (médico → `/medico`, gestor → `/gestor`)
- Rotas protegidas por perfil e logout

**Área do médico** (`/medico`)
- Meu Registro: dados profissionais e resumo da agenda
- Próximos atendimentos e Atendimentos passados, com link para o paciente
- Busca de paciente por CPF (máscara + validação dos dígitos); se não existir, oferece o cadastro
- Prontuário unificado (`/medico/paciente/:cpf`), com destaque para **alergias** e **tipo sanguíneo**
- Registro de atendimento: atualiza alergias, medicamentos e condições; vincula a um agendamento; anexa receitas/laudos (no mock guarda só o nome do arquivo e a data)

**Área do gestor** (`/gestor`)
- Filtros de região e período
- Indicadores: atendimentos, pacientes, média mensal e condição mais frequente
- Gráficos: atendimentos por região, condições mais frequentes e evolução mensal (cada um com visão em tabela)

**Chatbot de suporte** (em todas as páginas)
- Fluxo de opções com respostas prontas: dados errados, falha de acesso, como baixar o app e falar com o suporte

## Stack

- [React 19](https://react.dev/) + [Vite](https://vite.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- [React Router 7](https://reactrouter.com/)
- [Recharts](https://recharts.org/) (gráficos do gestor)

Nenhuma outra biblioteca de runtime: os ícones são SVGs inline e os formulários usam estado do React.

## Como rodar

Pré-requisito: Node.js 20.19+ ou 22.12+ (exigência do Vite).

```bash
npm install
npm run dev
```

Acesse http://localhost:5173.

O arquivo `.env` é opcional: sem ele, o projeto roda em modo mock. Para configurar, copie o exemplo:

```bash
cp .env.example .env
```

Outros scripts:

| Comando | Descrição |
|---|---|
| `npm run build` | Checagem de tipos + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente |
| `npm run typecheck` | Só a checagem de tipos |

## Usuários de teste

| Perfil | E-mail | Senha |
|---|---|---|
| Médico | `medico@teste.com` | `123456` |
| Gestor | `gestor@teste.com` | `123456` |

A tela de login mostra esses usuários com um botão "Preencher".

**CPFs de pacientes mockados** (também listados na tela de busca):

| Paciente | CPF | Destaque |
|---|---|---|
| Maria Aparecida da Silva | 123.456.789-09 | Diabetes, hipertensão, alergia grave a penicilina |
| João Pedro Oliveira Santos | 987.654.321-00 | Asma |
| Ana Luiza Ferreira Costa | 456.123.789-55 | Anemia, sem alergias |
| Carlos Eduardo Ribeiro | 321.654.987-91 | Cardiopata, 3 alergias |
| Beatriz Souza Almeida | 741.852.963-55 | Alergia grave a amendoim |
| Pedro Henrique Martins | 159.357.486-06 | Ansiedade |

Para testar o cadastro, busque um CPF válido que não esteja na lista, como `111.444.777-35`.

> As alterações feitas no modo mock (cadastros e atendimentos) ficam em memória e no `sessionStorage`: sobrevivem a um F5, mas somem ao fechar a aba.

## Estrutura de pastas

```
├─ API_CONTRACT.md          Contrato de endpoints e JSON para o backend
├─ .env.example             Variáveis de ambiente
├─ vercel.json              Rewrite de SPA para o deploy
└─ src/
   ├─ main.tsx              Ponto de entrada
   ├─ App.tsx               Rotas
   ├─ config.ts             Link do app, contatos de suporte
   ├─ index.css             Tailwind + tema (cores azul/verde-água)
   ├─ types/                Tipos das entidades (contrato com o backend)
   ├─ services/api.ts       Camada única de acesso a dados (mock ou API real)
   ├─ mocks/                Dados fictícios e "banco" em memória
   ├─ contexts/             AuthContext (login, logout, sessão)
   ├─ hooks/                useApi (carregamento/erro de chamadas)
   ├─ utils/                CPF (máscara/validação) e formatação de datas
   ├─ components/
   │  ├─ ui/                Button, Card, Input/Select/Textarea, Badge, Alert, Spinner, Icon
   │  ├─ layout/            Header/Footer do site, DashboardLayout (menu lateral), Logo
   │  ├─ medico/            Componentes da área do médico
   │  ├─ ProtectedRoute.tsx Rota protegida por perfil
   │  └─ Chatbot.tsx        Widget de suporte
   └─ pages/
      ├─ Home.tsx, Login.tsx, NotFound.tsx
      ├─ medico/            MeuRegistro, Atendimentos, BuscarPaciente,
      │                     CadastrarPaciente, Prontuario, RegistrarAtendimento
      └─ gestor/            GestorDashboard
```

## Trocar o mock pela API real

Todas as telas usam apenas as funções de `src/services/api.ts`. Cada função verifica `VITE_USE_MOCK`:

- `"true"` (ou ausente): devolve os dados de `src/mocks/` com um pequeno atraso simulado;
- `"false"`: faz `fetch` para `VITE_API_URL`, enviando o token no header `Authorization: Bearer`.

Para usar o backend:

1. Ajuste o `.env`:
   ```env
   VITE_USE_MOCK=false
   VITE_API_URL=https://sua-api.com/api
   ```
2. Reinicie o `npm run dev` (o Vite só lê o `.env` ao iniciar).
3. Garanta que o backend siga o [`API_CONTRACT.md`](API_CONTRACT.md) e libere CORS para a origem do front.

Nenhuma tela precisa ser alterada. Na Vercel, configure as mesmas variáveis em *Project Settings → Environment Variables* e faça um novo deploy.

## Deploy na Vercel

1. Importe o repositório na Vercel (o framework **Vite** é detectado automaticamente).
2. Build command: `npm run build` · Output directory: `dist`.
3. (Opcional) Defina `VITE_USE_MOCK` e `VITE_API_URL`.

O `vercel.json` redireciona todas as rotas para o `index.html`, para que links diretos como `/medico/paciente/12345678909` funcionem.

## Acessibilidade

- Labels em todos os campos, mensagens de erro ligadas por `aria-describedby`
- Foco visível em todos os elementos interativos e link "Pular para o conteúdo"
- Accordion, menus e chatbot com `aria-expanded`; chatbot fecha com `Esc`
- Alergias e status nunca dependem só de cor (sempre há texto)
- Gráficos com tabela de dados alternativa

## Próximos passos

- [ ] Integrar com a API real e testar o contrato com o time do backend
- [ ] Autenticação real (JWT com expiração e renovação de token)
- [ ] Registro de auditoria: quem acessou cada prontuário (LGPD)
- [ ] Editar/encerrar medicamentos e condições existentes (hoje só é possível adicionar)
- [ ] Visualizar/baixar os arquivos anexados
- [ ] Paginação e busca por nome na lista de atendimentos
- [ ] Exportar os dados do painel do gestor (CSV/PDF) e mapa por região
- [ ] Testes automatizados (Vitest + Testing Library) e lint (ESLint)
- [ ] Trocar o link de download pelo do app publicado (`src/config.ts`)
