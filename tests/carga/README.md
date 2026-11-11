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

Passo a passo da infraestrutura em [`docs/infraestrutura.md`](../../docs/infraestrutura.md). Os três cenários rodam com um comando só, a partir da raiz do repositório:

1. Suba a API com o limite de login desligado (a carga faz muitos logins seguidos do mesmo IP e levaria 429):

   ```bash
   cd infra && npm run deploy:api -- -c loginRateLimit=false && cd ..
   ```

2. Abra o dashboard `saude-unificada-api` do CloudWatch (o script mostra o link) e rode:

   ```bash
   node tests/carga/cenarios-aws.mjs
   ```

   O [`cenarios-aws.mjs`](cenarios-aws.mjs) usa a AWS CLI já configurada e leva uns 35 minutos:

   | Etapa | O que faz |
   |---|---|
   | C02 | trava o auto scaling em 1 tarefa, espera ela ficar saudável e roda 5 min de carga |
   | C03 | libera o auto scaling (1 a 3) e roda 10 min de carga |
   | C04 | sem carga, espera até 30 min o serviço voltar para 1 tarefa |
   | fim | devolve o auto scaling para 1 a 3 (mesmo se der erro no meio), baixa o histórico do auto scaling e as métricas do CloudWatch e confere os critérios de aceite |

   Opções: `--usuarios 20`, `--c02 300`, `--c03 600`, `--c04 1800` (segundos) e `--cenarios C03,C04` para rodar só alguns.

3. Religue o limite de login (`cd infra && npm run deploy:api`) ou derrube a API (`npm run destroy:api`).

O script grava em `tests/relatorios/`:

- `carga-aws-c02-AAAA-MM-DD.json` e `carga-aws-c03-AAAA-MM-DD.json`: resultado da carga, com req/s, p50 e p95 minuto a minuto (sem as amostras individuais);
- `escalabilidade-aws-AAAA-MM-DD.json`: critérios de aceite, linha do tempo das tarefas (desejadas, rodando, saudáveis no ALB, a cada 20 s), atividades do auto scaling e as séries do CloudWatch (CPU, memória, tarefas saudáveis, requisições, p95 e 5xx por minuto).

No fim, ele imprime as linhas prontas para a tabela de carga do relatório de qualidade.

## Evidências para guardar em `tests/relatorios/`

- Os JSON da carga. O `cenarios-aws.mjs` já salva sem as amostras; se rodar o `load-test.mjs` direto com `--saida`, apague o campo `samples`, que é grande, antes de commitar:

  ```bash
  node -e "const f=process.argv[1],fs=require('fs'),r=JSON.parse(fs.readFileSync(f));delete r.samples;fs.writeFileSync(f,JSON.stringify(r,null,2)+'\n')" arquivo.json
  ```

- Prints do dashboard do CloudWatch durante o C03: tarefas saudáveis, CPU, requisições, tempo de resposta.
- O `escalabilidade-aws-AAAA-MM-DD.json`.
- Uma linha por cenário na tabela de carga do [relatório de qualidade](../relatorios).
