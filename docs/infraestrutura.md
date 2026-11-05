# Infraestrutura na AWS

Infraestrutura como código com **AWS CDK em TypeScript** (pasta [`infra/`](../infra)), na região **Virgínia do Norte (`us-east-1`)**.
Feita para a disciplina de Computação em Nuvem II com três objetivos: **serviços escaláveis**, **monitoramento** e **gastar o mínimo** (teto do projeto: **R$ 100**, ≈ US$ 18).

> **Por que us-east-1 e não São Paulo?** A conta foi criada pelo novo cadastro da AWS (com "projetos"), que aplica uma SCP gerenciada pela própria AWS liberando só `us-east-1`, `us-west-2` e a região escolhida no projeto. Em `sa-east-1` todo comando volta `explicit deny in a service control policy`. A Virgínia do Norte ainda é a região mais barata; o custo é ~0,1 s a mais por requisição vindo do Brasil, que não atrapalha a demo.

## Arquitetura

```mermaid
flowchart LR
  site[Site<br/>Vercel] -->|HTTPS| cf
  app[App do paciente] -->|HTTPS| cf
  cf[CloudFront<br/>HTTPS grátis, sem cache] -->|HTTP + header secreto| alb[Application<br/>Load Balancer]
  alb --> t1[Tarefa 1]
  alb -.-> t2[Tarefa 2]
  alb -.-> t3[Tarefa 3]
  subgraph ecs[ECS Fargate Spot · auto scaling 1 a 3 pela CPU]
    t1
    t2
    t3
  end
  ecs -->|TLS| atlas[(MongoDB Atlas<br/>Free)]
  ecs -->|role da tarefa| s3[(S3 privado<br/>receitas e laudos)]
  ecs --> cw[CloudWatch<br/>logs, dashboard, alarmes]
  cw -->|e-mail| sns[SNS]
  ssm[SSM Parameter Store<br/>MONGODB_URI, JWT_SECRET] -.-> ecs
```

São duas stacks:

| Stack | O que tem | Fica ligada? |
|---|---|---|
| `SaudeUnificadaData` | Bucket S3 dos documentos, tópico de alertas (e-mail), orçamento | Sim, custa centavos |
| `SaudeUnificadaApi` | VPC, ECS Fargate, ALB, CloudFront, auto scaling, alarmes, dashboard | **Só quando precisa** (testes, apresentação, vídeo) |

Os dados (pacientes, atendimentos...) ficam no **MongoDB Atlas Free**, fora da AWS, então derrubar a `SaudeUnificadaApi` não apaga nada.

## Decisões para gastar pouco

| Decisão | Por quê |
|---|---|
| **Sem NAT Gateway** | É o item mais caro de uma VPC (~US$ 33/mês só ligado, sem contar o tráfego). As tarefas ficam em subnet pública com IP próprio. |
| **Fargate Spot** | Até ~70% mais barato que o Fargate normal. Pode ser interrompido: o ECS sobe outra tarefa sozinho. No dia da gravação dá para usar o normal (`-c useSpot=false`). |
| **Menor tarefa possível** (0,25 vCPU, 512 MB) | A API usa ~150 MB de memória. Tarefa pequena também faz a CPU subir rápido no teste de carga e mostrar o auto scaling. |
| **CloudFront na frente** | HTTPS de graça (o site na Vercel é HTTPS e não pode chamar API em HTTP) e entra no nível gratuito permanente (1 TB e 10 milhões de requisições por mês). |
| **Sem Container Insights** | Cobra por métrica. As métricas básicas do ECS (CPU e memória) e do ALB já são grátis e alimentam o dashboard. |
| **Logs por 7 dias** | O CloudWatch Logs dá 5 GB grátis; logs antigos não servem para a demo. |
| **Segredos no SSM Parameter Store** | SecureString no nível padrão é grátis (o Secrets Manager cobra por segredo). |
| **Stack da API sob demanda** | O custo é por hora: sobe para testar/gravar, desce depois (`npm run destroy:api`). |
| **Orçamento com aviso por e-mail** | AWS Budgets (2 orçamentos grátis): avisa aos 50%, 80% e 100% de US$ 18 e se a previsão do mês passar disso. |

### Custo estimado (us-east-1, valores aproximados)

| Item | Custo por hora ligada |
|---|---|
| Application Load Balancer | ~US$ 0,023 |
| IPs públicos (2 do ALB + 1 por tarefa) | US$ 0,005 cada → ~US$ 0,015 |
| Fargate Spot (0,25 vCPU, 512 MB) | ~US$ 0,004 por tarefa |
| CloudFront, CloudWatch, SNS, Budgets, SSM | US$ 0 (nível gratuito) |
| S3 e imagem no ECR (fica ligado) | centavos por mês |
| **Total com 1 tarefa** | **~US$ 0,042/h (≈ R$ 0,23/h)** |

| Cenário | Horas | Custo aproximado |
|---|---|---|
| Sessões de teste e gravação | 40 h | ~US$ 1,7 (≈ R$ 9) |
| Ligado 8 h por dia durante 2 semanas | 112 h | ~US$ 4,7 (≈ R$ 26) |
| **Esquecido ligado 24 h por 3 semanas** | 504 h | ~US$ 21 (≈ R$ 115): **estoura o teto**, o orçamento avisa por e-mail |

Conta AWS nova no **plano Free** recebe US$ 100 em créditos (até US$ 200 com as atividades de onboarding), que cobrem tudo isso. Confira os valores na [calculadora da AWS](https://calculator.aws/) antes de subir.

## Pré-requisitos (uma vez)

- [Node.js 20+](https://nodejs.org), [Docker Desktop](https://www.docker.com/products/docker-desktop/) (aberto na hora do deploy: ele monta a imagem da API) e [AWS CLI v2](https://aws.amazon.com/cli/).
- Conta na AWS (de preferência nova, plano Free) e conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

### 1. MongoDB Atlas (gratuito)

1. Crie um cluster **Free (M0)** com provedor **AWS**, de preferência em **N. Virginia (us-east-1)**, perto da API. Um cluster gratuito que já exista serve: a API usa um banco próprio (`saude-unificada`), criado sozinho no primeiro seed.
2. *Database Access*: crie um usuário com senha forte (gerada pelo Atlas).
3. *Network Access*: libere `0.0.0.0/0`. As tarefas do Fargate não têm IP fixo (IP fixo exigiria NAT Gateway, que é caro), e o cluster gratuito não aceita conexão privada. A proteção fica por conta do usuário e senha fortes e do TLS, que o Atlas sempre exige.
4. *Connect → Drivers*: copie a string de conexão e coloque o nome do banco antes do `?`:
   `mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/saude-unificada?retryWrites=true&w=majority`

### 2. Acesso à AWS pelo computador

1. No console da AWS, crie um usuário do IAM (ex.: `saude-unificada-deploy`) com a política `AdministratorAccess` e gere uma **chave de acesso** para a CLI (caso de uso "Interface de linha de comando"). Não use o usuário root. Atenção: é em **IAM → Usuários**, não em Funções.
2. No PowerShell:
   ```powershell
   aws configure          # chave, segredo, região us-east-1, formato json
   aws sts get-caller-identity   # confere a conta
   ```

### 3. Segredos da API (SSM Parameter Store)

```powershell
$jwt = node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
aws ssm put-parameter --region us-east-1 --type SecureString --overwrite --name /saude-unificada/jwt-secret --value $jwt
aws ssm put-parameter --region us-east-1 --type SecureString --overwrite --name /saude-unificada/mongodb-uri --value "mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/saude-unificada?retryWrites=true&w=majority"
```

## Subir

```powershell
cd infra
npm ci
npm test                         # 18 testes das regras da infraestrutura (não precisa de conta AWS)
npx cdk bootstrap                # só na primeira vez em cada conta/região
npm run deploy -- -c alertEmail=seu@email.com -c corsOrigins="http://localhost:5173,https://SEU-SITE.vercel.app"
```

- O primeiro deploy leva **~10 minutos** (o CloudFront demora para propagar). O Docker Desktop precisa estar aberto.
- Confirme o e-mail **"AWS Notification - Subscription Confirmation"** para receber os alarmes.
- No fim aparecem as saídas: `ApiUrl`, `SwaggerUrl` e `DashboardUrl`.

### Dados de demonstração no Atlas e no S3

```powershell
cd ..\backend
$env:MONGODB_URI = "mongodb+srv://..."      # a mesma string do SSM
$env:STORAGE_DRIVER = "s3"
$env:S3_BUCKET = "NOME-DO-BUCKET"           # saída DocumentsBucketName da stack SaudeUnificadaData
$env:AWS_REGION = "us-east-1"
npm run seed
```

### Conferir

```powershell
node backend/scripts/smoke-test.mjs https://dxxxxxxxx.cloudfront.net   # 9 verificações
```

## Demonstrar a escalabilidade

1. Abra o dashboard (`DashboardUrl`): gráficos de **tarefas saudáveis**, **CPU**, **requisições**, **tempo de resposta** e **erros**.
2. Desligue o limite de tentativas de login, senão a carga (muitos logins seguidos do mesmo IP) leva 429 em vez de exercitar a CPU:
   ```powershell
   cd infra; npm run deploy:api -- -c loginRateLimit=false; cd ..
   ```
   Rode a carga no login (o bcrypt gasta CPU e faz só 1 leitura no banco, sem estourar o Atlas gratuito):
   ```powershell
   node backend/scripts/load-test.mjs https://dxxxxxxxx.cloudfront.net --duracao 600 --usuarios 20 --saida carga-aws.json
   ```
3. Em ~3 minutos a CPU passa de 50% e o auto scaling sobe para 2 e depois 3 tarefas; o tempo de resposta cai. Depois da carga, ele volta para 1 tarefa.
4. Evidências para o relatório: print do dashboard, o `carga-aws.json` e o histórico do auto scaling:
   ```powershell
   aws application-autoscaling describe-scaling-activities --service-namespace ecs --region us-east-1 --max-items 10
   ```
5. Religue o limite de login: `cd infra; npm run deploy:api; cd ..`.

## Monitoramento

- **Dashboard `saude-unificada-api`**: estado dos alarmes, tarefas saudáveis (mostra o auto scaling), CPU e memória com a linha do alvo de 50%, requisições por minuto, tempo de resposta p50/p95, erros 4xx/5xx.
- **Alarmes (e-mail ao disparar e ao normalizar):**

  | Alarme | Quando dispara |
  |---|---|
  | `saude-unificada-api-fora-do-ar` | Nenhuma tarefa saudável por 2 minutos |
  | `saude-unificada-erros-5xx` | 10 ou mais erros 5xx em 5 minutos |
  | `saude-unificada-resposta-lenta` | p95 acima de 2 s por 5 minutos |
  | `saude-unificada-cpu-no-limite` | CPU média acima de 85% por 10 minutos (auto scaling no máximo) |

- **Logs**: grupo `/saude-unificada/api` no CloudWatch Logs (7 dias).
- **Health checks**: o ALB usa `/api/health/live` (não depende do banco); `/api/health` mostra também o MongoDB.

## Segurança

- HTTPS do usuário até o CloudFront; o **ALB só aceita requisições com o header secreto** que o CloudFront envia (acesso direto ao ALB responde 403).
- Bucket S3 **privado**, criptografado (AES-256) e só com HTTPS; download por URL pré-assinada de 5 minutos.
- A API acessa o S3 pela **role da tarefa**: nenhuma chave da AWS no código ou nas variáveis.
- `MONGODB_URI` e `JWT_SECRET` no **SSM Parameter Store** (SecureString), lidos pelo ECS na hora de subir a tarefa.
- Atlas com TLS obrigatório e usuário próprio da aplicação.

## Desligar

```powershell
cd infra
npm run destroy:api      # derruba a parte que cobra por hora (dados e S3 continuam)
npm run deploy:api       # sobe de novo quando precisar (~10 min)
```

**Fim do projeto** (depois da apresentação):

```powershell
npm run destroy:all      # apaga tudo, inclusive o bucket e os arquivos de teste
aws ssm delete-parameter --region us-east-1 --name /saude-unificada/mongodb-uri
aws ssm delete-parameter --region us-east-1 --name /saude-unificada/jwt-secret
```

E apague a chave de acesso do usuário IAM e o cluster do Atlas.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Deploy falha montando a imagem | Docker Desktop fechado. |
| Tarefa reinicia e o log diz que não conectou no MongoDB | `MONGODB_URI` errada no SSM ou `0.0.0.0/0` não liberado no Atlas. |
| A API caiu por 1–2 minutos e voltou sozinha | Interrupção do Fargate Spot (o ECS sobe outra tarefa). Para gravar o vídeo sem risco: `npm run deploy:api -- -c useSpot=false`. |
| Site recebe erro de CORS | Endereço do site faltando no `-c corsOrigins=...` do deploy. |
| `explicit deny in a service control policy` | Região fora das liberadas para o projeto (use `us-east-1`) ou serviço fora do plano Free. ECS, ALB, CloudFront, SSM, S3, CloudWatch, SNS e Budgets estão liberados no plano Free. |
| Deploy bloqueado perto do fim dos créditos | Se houver um *spend limit* no AWS Settings, a AWS bloqueia criar ALB e serviço ECS quando o gasto chega perto do limite. |
