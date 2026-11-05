# Testes de carga, desempenho e escalabilidade

Script: [`backend/scripts/load-test.mjs`](../../backend/scripts/load-test.mjs). Ele não precisa instalar nada além do Node 20+ e roda no Windows, no Linux e no CI.

## O que ele faz

- **N usuários simultâneos** fazem login (`POST /api/auth/login`) sem parar, durante o tempo escolhido.
- A cada 15 s, mostra **requisições por segundo**, **p50**, **p95** e **erros**.
- No fim, mostra o resumo. Com `--saida`, salva também cada requisição num JSON.

**Por que o login:** o bcrypt gasta CPU de propósito, e o login faz só uma leitura no banco. É o cenário certo para:

- fazer a CPU subir e mostrar o **auto scaling** da AWS;
- não estourar o limite de operações por segundo do MongoDB Atlas gratuito.

## Cenários

| ID | Cenário | Ambiente | Usuários | Duração | Objetivo |
|---|---|---|---|---|---|
| C01 | Linha de base | Local (`npm run dev:memory`, 1 processo) | 10 | 60 s | Vazão e p95 de uma instância, sem rede |
| C02 | 1 tarefa fixa | AWS (auto scaling travado em 1) | 20 | 5 min | Limite de 1 tarefa (0,25 vCPU) |
| C03 | Auto scaling | AWS (1 → 3 tarefas) | 20 | 10 min | Escalabilidade: tarefas sobem, p95 cai, erros < 1% |
| C04 | Volta ao normal | AWS, depois do C03 | 0 | ~15 min | Auto scaling reduz para 1 tarefa |

**Critério de aceite** (do [plano de testes](../plano-de-testes.md)):

- taxa de erro < 1% em todos os cenários;
- no C03, o auto scaling chega a pelo menos 2 tarefas;
- no C03, o p95 do fim da carga fica menor que o do C02.

## Como rodar

### Local (C01)

Terminal 1: suba a API com o limite de tentativas de login desligado, porque a carga faz muitos logins seguidos do mesmo IP:

```bash
cd backend && LOGIN_RATE_LIMIT=0 LOGIN_RATE_LIMIT_IP=0 npm run dev:memory
```

No PowerShell (Windows):

```powershell
cd backend; $env:LOGIN_RATE_LIMIT='0'; $env:LOGIN_RATE_LIMIT_IP='0'; npm run dev:memory
```

Terminal 2, na raiz do repositório:

```bash
node backend/scripts/load-test.mjs http://localhost:3000 --duracao 60 --usuarios 10 --saida carga-local.json
```

### AWS (C02 a C04)

Passo a passo completo em [`docs/infraestrutura.md`](../../docs/infraestrutura.md), seção "Demonstrar a escalabilidade". Resumo:

1. Suba a API com o limite de login desligado:

   ```bash
   cd infra && npm run deploy:api -- -c loginRateLimit=false
   ```

2. **C02:** trave em 1 tarefa e rode 5 minutos:

   ```bash
   aws application-autoscaling register-scalable-target --service-namespace ecs --scalable-dimension ecs:service:DesiredCount --resource-id service/<cluster>/<serviço> --min-capacity 1 --max-capacity 1 --region us-east-1
   ```

   ```bash
   node backend/scripts/load-test.mjs https://<cloudfront> --duracao 300 --usuarios 20 --saida tests/relatorios/carga-aws-1-tarefa.json
   ```

3. **C03:** destrave (`--max-capacity 3`) e rode 10 minutos com o dashboard `saude-unificada-api` aberto no CloudWatch:

   ```bash
   node backend/scripts/load-test.mjs https://<cloudfront> --duracao 600 --usuarios 20 --saida tests/relatorios/carga-aws-autoscaling.json
   ```

4. **C04:** espere ~15 min e guarde o histórico do auto scaling:

   ```bash
   aws application-autoscaling describe-scaling-activities --service-namespace ecs --region us-east-1 --max-items 10 > tests/relatorios/autoscaling-atividades.json
   ```

5. Religue o limite de login (`npm run deploy:api`) ou derrube a API (`npm run destroy:api`).

## Evidências para guardar em `tests/relatorios/`

- Os JSON da carga. Antes de commitar, apague o campo `samples`, que é grande:

  ```bash
  node -e "const f=process.argv[1],fs=require('fs'),r=JSON.parse(fs.readFileSync(f));delete r.samples;fs.writeFileSync(f,JSON.stringify(r,null,2)+'\n')" arquivo.json
  ```

- Prints do dashboard do CloudWatch durante o C03: tarefas saudáveis, CPU, requisições, tempo de resposta.
- O `autoscaling-atividades.json`.
- Uma linha por cenário na tabela de carga do [relatório de qualidade](../relatorios).
