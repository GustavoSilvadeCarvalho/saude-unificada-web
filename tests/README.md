# Testes e qualidade — Saúde Unificada

Pasta de **Qualidade e Teste de Software** do PI 6. Ela reúne o plano de testes, os casos de segurança, o roteiro de carga e os relatórios com as evidências de execução.

O código dos testes automatizados fica junto do código testado:

| Onde | O que | Ferramenta | Quantidade |
|---|---|---|---|
| [`backend/test/*.e2e-spec.ts`](../backend/test) | Testes funcionais de ponta a ponta da API (HTTP real + MongoDB em memória) e de segurança | Vitest + Supertest + mongodb-memory-server | 162 |
| [`backend/test/*.spec.ts`](../backend/test) | Testes unitários (CPF, senha, arquivos, armazenamento) | Vitest | 51 |
| [`infra/test/infra.test.ts`](../infra/test/infra.test.ts) | Regras da infraestrutura AWS: custo, segurança, escalabilidade e monitoramento | `node:test` + assertions do AWS CDK | 20 |
| [`backend/scripts/smoke-test.mjs`](../backend/scripts/smoke-test.mjs) | Teste de fumaça numa API já no ar (local, Docker ou AWS) | Node | 9 verificações |
| [`backend/scripts/load-test.mjs`](../backend/scripts/load-test.mjs) | Teste de carga e escalabilidade | Node | ver [`carga/`](carga) |

## Conteúdo desta pasta

```
tests/
├─ README.md                          este arquivo
├─ plano-de-testes.md                 estratégia, escopo, critérios de aceite e rastreabilidade (requisito → teste)
├─ casos-de-teste.md                  51 casos de teste em tabela (entrada, esperado, obtido, situação)
├─ seguranca/casos-de-seguranca.md    casos de segurança (OWASP Top 10) e onde cada um é testado
├─ carga/README.md                    roteiro dos testes de carga e escalabilidade (local e AWS)
└─ relatorios/
   ├─ escalabilidade-e-custo.md              o balanceamento funcionou? e o custo para 100 mil, 1 milhão e 10 milhões de pacientes
   ├─ relatorio-de-qualidade-2026-11-05.md   resultados consolidados da rodada
   ├─ junit-api-2026-11-05.xml               resultado de cada teste da API (formato JUnit)
   ├─ cobertura-api-2026-11-05.json          cobertura de código por arquivo
   ├─ carga-local-2026-11-05.json            linha de base do teste de carga (máquina local)
   ├─ capacidade-consultas-local-2026-11-09.json  quanto 1 instância aguenta em cada consulta
   ├─ carga-aws-c02/c03-2026-11-06.json, escalabilidade-aws-2026-11-06.json  carga na AWS (sem a correção do keep-alive)
   └─ carga-aws-pos-correcao-2026-11-05/     carga na AWS com a correção (0% de erros) e métricas do CloudWatch
```

## Como rodar

Pré-requisito: Node.js 20+. Os testes da API não precisam de MongoDB instalado (sobem um em memória).

```bash
cd backend && npm ci && npm run test:cov
```

```bash
cd infra && npm ci && npm test
```

Teste de fumaça e carga contra uma API no ar (ex.: `npm run dev:memory` em outro terminal):

```bash
node backend/scripts/smoke-test.mjs http://localhost:3000
```

```bash
node backend/scripts/load-test.mjs http://localhost:3000 --duracao 60 --usuarios 10
```

## Evidências de execução

- **GitHub Actions** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) roda tudo em cada push: typecheck, testes da API com cobertura mínima, imagem Docker + teste de fumaça, testes da infra + `cdk synth` e build do site. A cobertura aparece no resumo da execução, e os relatórios (HTML de cobertura e JUnit) ficam como artefato por 30 dias.
- **Relatórios versionados** em [`relatorios/`](relatorios), um por rodada, com data no nome.
