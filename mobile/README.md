# Saúde Unificada — App mobile

Aplicativo dos **pacientes** (React Native + Expo, TypeScript): carteira digital de saúde,
histórico de atendimentos, agendamentos, exames e log de acessos (LGPD).

Segue o [`../docs/API_CONTRACT.md`](../docs/API_CONTRACT.md) — seção 5 (app do paciente) —
e consome a mesma API do [`../backend`](../backend). Profissionais e gestores continuam
usando o site ([`../frontend`](../frontend)).

## Estrutura

```
src/
  app/                  # Rotas (Expo Router, file-based)
    _layout.tsx         # Pilha raiz + AuthProvider + SafeArea
    index.tsx           # Redireciona para login ou carteira
    login.tsx           # Login por CPF + senha
    register.tsx        # Primeiro acesso (CPF + nascimento + senha)
    (tabs)/
      _layout.tsx       # Barra inferior (5 seções)
      carteira.tsx      # Carteira Digital de Saúde (GET /me/record)
      historico.tsx     # Atendimentos realizados
      agendamentos.tsx  # Atendimentos agendados
      exames.tsx        # Exames e resultados (GET /me/exams)
      conta.tsx         # Sessão + log LGPD + sair
    atendimento/[id].tsx# Detalhe: resumo + documentos (download por link temporário)
  auth/                 # Contexto de autenticação (token no SecureStore)
  services/             # Camada única de API (docs/API_CONTRACT.md)
  components/           # UI compartilhada (equivalentes dos componentes do site)
  hooks/                # useAsync (equivalente do useApi do site)
  utils/                # CPF (máscara/validação) e datas (pt-BR)
  theme.ts              # Paleta/medições espelhadas do site (index.css)
```

## Como rodar

### 1. Backend no ar primeiro

O app consome a API do [`../backend`](../backend). Sem MongoDB instalado, use o
modo in-memory (sobe um MongoDB temporário + os dados do seed):

```bash
cd ../backend
npm install
copy .env.example .env
npm run dev:memory
```

Deixe esse terminal aberto. Confira em http://localhost:3000/api/health — deve
responder `{"status":"ok","mongodb":"up",...}`. (Com MongoDB local de replica
set instalado, `npm run dev` também funciona.)

### 2. App mobile

```bash
npm install
copy .env.example .env     # ajuste a URL da API conforme a tabela abaixo
npm start                  # ou: npx expo start
```

Abra no **Expo Go (SDK 58)** escaneando o QR code do terminal, ou no emulador
(tecla `a`), ou como prévia web (tecla `w`).

### Onde o app busca a API (`.env`)

| Onde o app roda | `EXPO_PUBLIC_API_URL` |
|---|---|
| Prévia no navegador (tecla `w`) | `http://localhost:3000/api` (padrão do `.env.example`) |
| Emulador Android | `http://10.0.2.2:3000/api` |
| **Celular físico** (mesma rede Wi-Fi do PC) | `http://<IP-do-PC>:3000/api` — ex.: `http://192.168.15.8:3000/api` |

Descubra o IP do PC com `ipconfig` (IPv4 do adaptador **Wi-Fi**). Depois de
editar o `.env`, **reinicie o `npm start`** — a variável só é lida na
inicialização, sem hot-reload.

Checklist do celular físico:

- Mesma rede Wi-Fi do PC (redes visitantes corporativas costumam isolar
  dispositivos entre si);
- Firewall do Windows liberando as portas de entrada **TCP 3000** (API) e
  **TCP 8081** (bundle do Expo/Metro);
- Teste rápido antes do QR code: no navegador do celular, abra
  `http://<IP-do-PC>:3000/api/health` — deve responder `{"status":"ok",...}`.

Dica: só a prévia web sofre com CORS (é restrição de navegador). Se usá-la,
inclua `http://localhost:8081` no `CORS_ORIGINS` do `../backend/.env`,
separado por vírgula. O app no celular (nativo) não é afetado por CORS.

### Login de teste (dados do seed)

| Fluxo | CPF | Credencial |
|---|---|---|
| Entrar | `229.169.264-02` | senha `paciente123` |
| Criar conta (primeiro acesso) | `507.179.272-96` | nascimento `05/11/1996` + senha à escolha (letras e números) |

## Checklist de qualidade

```bash
npx tsc --noEmit        # typecheck
npx expo lint           # lint
npx expo-doctor         # diagnóstico de dependências
```

## Decisões de UX mobile

- Login e-first, por CPF (não por e-mail): teclado numérico, máscara progressiva,
  validação local dos dígitos antes de chamar a API.
- Barra inferior com 5 seções dentro do alcance do polegar; ações principais (*Entrar*,
  *Sair*) com alvos de 48dp.
- Carteira prioriza informações de emergência (tipo sanguíneo e alergias) no topo.
- Listas virtualizadas (FlatList) com pull-to-refresh e estados de vazio/erro/retry.
- Download de receitas/laudos por link temporário aberto com `Linking.openURL`.

## Próximos passos

- Modo escuro (`userInterfaceStyle` + tema dinâmico).
- Cache offline do prontuário (AsyncStorage) para acesso sem rede.
- Notificações de novos agendamentos (expo-notifications) e biometria no login (expo-local-authentication).
- Builds de produção via EAS (`eas build`) e updates OTA (`eas update`).
