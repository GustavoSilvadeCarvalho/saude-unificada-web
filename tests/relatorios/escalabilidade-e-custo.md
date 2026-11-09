# Escalabilidade e custo — o balanceamento funcionou? Quanto custa crescer?

| Item | Valor |
|---|---|
| Data | 09/11/2026 (testes na AWS em 05 e 06/11/2026) |
| Ambiente | AWS us-east-1: CloudFront → Application Load Balancer → ECS Fargate Spot (tarefas de 0,25 vCPU e 512 MB, auto scaling de 1 a 3 pela CPU com alvo de 50%) → MongoDB Atlas M0 e S3 |
| Evidências | Pasta [`relatorios/`](.): [`escalabilidade-aws-2026-11-06.json`](escalabilidade-aws-2026-11-06.json), [`carga-aws-pos-correcao-2026-11-05/`](carga-aws-pos-correcao-2026-11-05), [`capacidade-consultas-local-2026-11-09.json`](capacidade-consultas-local-2026-11-09.json) |

## 1. Resposta curta

**Sim, o balanceamento e o auto scaling funcionaram.**

- Com a carga, a AWS subiu sozinha de **1 para 3 tarefas**, e o load balancer passou a dividir as requisições entre elas.
- Sem carga, voltou sozinha para **1 tarefa**, cerca de 20 minutos depois.
- Depois de corrigir um defeito de conexão (seção 3), a taxa de erro ficou em **0%**.
- **Ressalva:** na última rodada a carga não ficou igual entre as 3 tarefas. A melhoria proposta está na seção 4.

**Custo para crescer** (estimativa da seção 5; os preços são referências públicas aproximadas):

| Pacientes cadastrados | Custo por mês | Custo por paciente por mês | Custo por 1 milhão de requisições |
|---|---|---|---|
| Demonstração (hoje) | ~R$ 170 se ficar ligada 24 h (~R$ 0,23/h) | — | — |
| 100 mil | ~R$ 600 | R$ 0,006 | ~R$ 300 |
| **1 milhão** | **~R$ 2.800** (otimizado: ~R$ 1.450) | **R$ 0,003** | **~R$ 140** |
| 10 milhões | ~R$ 13.000 | R$ 0,0013 | ~R$ 65 |
| **Brasil inteiro: 1,5 a 2,5 milhões de atendimentos por dia** | **~R$ 30.800 a 46.800** | R$ 0,0006 a 0,0007 **por atendimento** | ~R$ 73 a 80 |

Quanto mais gente usa, **mais barato fica por pessoa**: a parte fixa (load balancer, banco) se divide entre mais usuários.

## 2. Como o balanceamento funciona

```mermaid
flowchart LR
  u[Usuários] --> cf[CloudFront<br/>HTTPS]
  cf --> alb[Load balancer<br/>divide as requisições]
  alb --> t1[Tarefa 1]
  alb --> t2[Tarefa 2]
  alb --> t3[Tarefa 3]
  cw[CloudWatch<br/>CPU média] -->|acima de 50%: +1 tarefa<br/>15 min abaixo de 45%: -1 tarefa| as[Auto scaling<br/>1 a 3 tarefas]
  as -.-> t2
  as -.-> t3
```

- O **load balancer** recebe todas as requisições e distribui entre as tarefas saudáveis. Ele só manda para a tarefa que responde ao `/api/health/live`.
- O **auto scaling** olha a CPU média a cada minuto. Passou de 50%, sobe mais uma tarefa (até 3). Ficou 15 minutos abaixo de 45%, desce uma.
- Uma tarefa nova leva **cerca de 1,5 minuto** para ficar pronta.

## 3. Resultados dos testes na AWS

Carga: 20 usuários fazendo login sem parar. O login é a operação mais pesada da API, porque o bcrypt gasta CPU de propósito para proteger as senhas.

| Rodada | Quando | Versão da API | C02: 1 tarefa (5 min) | C03: auto scaling (10 min) | Tarefas | Erros |
|---|---|---|---|---|---|---|
| 1 | 05/11, 22:58 | Sem a correção | 2,8 req/s · p95 9,6 s | 6,0 req/s · p95 6,2 s | 1 → 3 → 1 | **1,65% / 1,09%** (502) |
| 2 | 05/11, 23:45 | **Com a correção** | 2,8 req/s · p95 8,9 s | 4,7 req/s · p50 1,7 s · p95 9,1 s | 1 → 3 → 1 | **0% / 0%** |
| 3 | 06/11, 01:13 | Sem a correção (outro deploy) | 2,9 req/s · p95 9,9 s | 5,9 req/s · p95 6,8 s | 1 → 3 → 1 | **3,14% / 1,21%** (502) |

Linha do tempo do auto scaling (horário de Brasília):

| Rodada | Subiu para 2 | Subiu para 3 | Fim da carga | Desceu para 2 | Voltou para 1 |
|---|---|---|---|---|---|
| 1 | 23:04 | 23:10 | 23:13 | 23:31 | 23:34 |
| 2 | 23:51 | 23:57 | 00:00 | 00:21 | 00:24 |

**O que os números mostram**

1. **Escala de verdade.** Na rodada 1, com 3 tarefas no fim da carga, a vazão chegou a **8,4 logins/s**. É 3 vezes a de 1 tarefa (2,8/s), ou seja, crescimento linear.
2. **Defeito encontrado e corrigido.** Os erros 502 vinham do próprio load balancer; a API não registrou nenhum erro.
   - **Causa:** o Node fechava conexões paradas em 5 s, e o load balancer as reaproveitava por até 60 s.
   - **Correção:** a API agora segura a conexão por 65 s.
   - **Prova:** a rodada 2, com a correção, teve **0 erros em 3.659 requisições**. A rodada 3 usou um deploy sem a correção e os erros voltaram, o que confirma a causa.
3. **Monitoramento funcionou.** O alarme de lentidão (p95 acima de 2 s) mandou e-mail durante a carga e avisou de novo quando normalizou.

## 4. Ressalva: carga desigual entre as tarefas

Na rodada 2, com 3 tarefas:

- o tempo **típico** caiu de 7,3 s para **cerca de 1 s** (p50);
- mas os **5% mais lentos** continuaram perto de 8,5 s (p95);
- a CPU média ficou em 87%, e não em 100%.

**Leitura:** uma das tarefas recebeu mais trabalho que as outras e acumulou fila. O load balancer divide por número de requisições (*round robin*), mas um login demora muito mais que as outras requisições.

**Melhoria proposta (não aplicada):** trocar o algoritmo do load balancer para `least_outstanding_requests`, que manda cada requisição para a tarefa com menos trabalho pendente. É uma linha no `infra/lib/api-stack.ts`, e depois é só repetir o C03.

## 5. Quanto custa se chegar mais gente

### 5.1 Capacidade de uma tarefa (medida)

| Operação | 1 processo local (Ryzen 5 5600GT) | 1 tarefa na AWS (0,25 vCPU) |
|---|---|---|
| Login (bcrypt) | 16,9 req/s | **2,8 req/s** (medido) |
| Abrir prontuário (com auditoria) | 599 req/s | ~100 req/s (estimado) |
| Agenda do médico | 1.116 req/s | ~185 req/s (estimado) |
| Carteira digital (app) | 854 req/s | ~140 req/s (estimado) |
| Atendimentos do paciente (app) | 1.511 req/s | ~250 req/s (estimado) |

A coluna da AWS aplica a mesma proporção medida no login: 2,8 ÷ 16,9 = 0,17.

As consultas são **35 a 90 vezes mais leves que o login**. Para a estimativa:
- usei uma mistura de **5% logins e 95% consultas**, considerando todas as consultas tão pesadas quanto abrir o prontuário (cenário pessimista);
- isso dá cerca de **36 req/s por tarefa** com a CPU em 100%;
- com o alvo do auto scaling em 50%, sobram **~18 req/s por tarefa**.

### 5.2 Premissas de uso

| Premissa | Valor | Por quê |
|---|---|---|
| Requisições por paciente por mês | 20 | Abrir o app 2 vezes por mês (~6 requisições cada) mais as consultas do médico no atendimento |
| Horário de uso | 12 h por dia | Unidades de saúde e uso do app durante o dia |
| Pico | 3 vezes a média | Manhãs de segunda-feira, campanhas de vacinação |
| Documentos | 2 por paciente por ano, 300 KB cada | Receitas e laudos em PDF |
| Dólar | R$ 5,50 | — |

Pico de requisições por segundo = pacientes × 20 ÷ (30 dias × 12 h × 3.600 s) × 3.

| Pacientes | Requisições por mês | Pico | Tarefas necessárias |
|---|---|---|---|
| 100 mil | 2 milhões | 4,6 req/s | 2 (mínimo para alta disponibilidade) |
| 1 milhão | 20 milhões | 46 req/s | 2 a 5 (média de 3) |
| 10 milhões | 200 milhões | 463 req/s | 4 a 10 tarefas maiores (1 vCPU), média de 7 |

### 5.3 Custo mensal estimado (US$)

Os preços são referências públicas da AWS (us-east-1, sob demanda) e do MongoDB Atlas, aproximados em nov/2026: Fargate US$ 0,0123/h por tarefa de 0,25 vCPU, load balancer US$ 0,0225/h, IP público US$ 0,005/h, CloudFront América do Sul US$ 0,022 por 10 mil requisições acima do nível gratuito, S3 US$ 0,023/GB. **Antes de usar em proposta oficial, confira na [AWS Pricing Calculator](https://calculator.aws/) e na página de preços do Atlas.**

| Item | 100 mil | 1 milhão | 10 milhões |
|---|---|---|---|
| ECS Fargate, sob demanda (sem Spot, para não cair) | 18 | 27 | 252 |
| Load balancer | 17 | 18 | 24 |
| IPs públicos | 15 | 18 | 33 |
| CloudFront (10 milhões de requisições/mês grátis) | 0 | 22 | 418 |
| MongoDB Atlas | 58 (M10) | 394 (M30) | ~1.460 (M50) |
| S3 (documentos) | 2 | 16 | 160 |
| CloudWatch (logs, alarmes) | 1 | 3 | 15 |
| Redis (limite de login entre tarefas) | — | 12 | 23 |
| **Total por mês** | **~US$ 110 (R$ 600)** | **~US$ 510 (R$ 2.800)** | **~US$ 2.390 (R$ 13.100)** |
| Por paciente por mês | R$ 0,006 | R$ 0,003 | R$ 0,0013 |
| **Por 1 milhão de requisições** | **R$ 300** | **R$ 140** | **R$ 65** |

**Para comparar, a demonstração de hoje** (1 tarefa Spot e Atlas M0 gratuito) custa cerca de **US$ 0,042/h**: R$ 0,23 por hora, ou ~R$ 170 por mês se ficar ligada direto. Por isso ela só sobe para testes e apresentações.

### 5.4 Onde está o custo e como baixar (cenário de 1 milhão)

- **O banco é ~77% do custo.** O que mais ocupa espaço é a auditoria (cada acesso ao prontuário vira um registro).
  - Guardar os últimos 6 meses no Atlas e arquivar o resto no S3, que é ~10 vezes mais barato, permite usar o **M20 (~US$ 146)** em vez do M30.
  - O total cai para **~US$ 260/mês (~R$ 1.450)**.
- **Fargate Spot** em parte das tarefas (mantendo 2 sob demanda) economiza mais ~US$ 10.
- **CloudFront:** acima de dezenas de milhões de requisições, vale avaliar os planos de preço fixo do CloudFront.
- **Região São Paulo** (`sa-east-1`), recomendada pela LGPD em produção: computação e load balancer custam cerca de 30% a 50% a mais que na Virgínia.

### 5.5 O que muda na arquitetura para 1 milhão

| Hoje (demonstração) | Para 1 milhão | Motivo |
|---|---|---|
| Atlas M0 gratuito | M30 (ou M20 com arquivamento) | O M0 tem 512 MB e limite de ~100 operações/s |
| Fargate Spot, 1 a 3 tarefas | Sob demanda, 2 a 5 tarefas, em 2 zonas | Não pode cair numa interrupção do Spot |
| Limite de login na memória de cada tarefa | Redis compartilhado (ElastiCache) | Com 5 tarefas, o limite por tarefa vira 5 vezes maior |
| Round robin | `least_outstanding_requests` | Seção 4 |
| Auditoria sem prazo | 6 meses no banco, depois arquivo no S3 | Seção 5.4 |

O código da API não precisa mudar para crescer: só a configuração da infraestrutura em `infra/`, que já é código (AWS CDK).

## 6. Cenário Brasil: 1,5 a 2,5 milhões de atendimentos por dia

**Premissa do grupo:** contando quem vai ao pronto-socorro, faz exames ou fica internado, o movimento total nos hospitais brasileiros (rede pública e particular) fica em torno de **1,5 a 2,5 milhões de pessoas por dia**. É uma estimativa trazida pelo grupo, não um dado oficial conferido. Aqui ela vira o pior caso: **todos os hospitais do país usando a plataforma**.

### 6.1 Quantas requisições cada atendimento gera

| O que acontece no atendimento | Requisições |
|---|---|
| Médico abre o prontuário | 1 |
| Médico consulta o histórico do paciente | 1 |
| Agenda do médico (atualizada entre um paciente e outro) | 1 |
| Registrar o atendimento (com alergias, remédios, condições) | 1 |
| Anexar receita ou laudo | 1 |
| Baixar ou conferir um documento (farmácia, outro hospital) | 1 |
| Paciente consulta o app depois (carteira e atendimentos) | 2 |
| **Consultas e gravações** | **8** |
| Logins: médico (1 a cada 20 pacientes, 0,05) + metade dos pacientes entrando no app (0,5) | 0,55 |
| **Total por atendimento** | **8,55** |

Os logins são só 6% das requisições, mas pesam mais da metade da CPU, por causa do bcrypt.

### 6.2 Volume e servidores necessários

Premissas: 70% do movimento entre 7h e 19h, e pico (segunda de manhã) com o dobro da média desse horário. Capacidade medida: ~62 req/s por vCPU com o auto scaling em 50% (seção 5.1).

| | **1,5 milhão de atendimentos por dia** | **2,5 milhões de atendimentos por dia** |
|---|---|---|
| Requisições por dia | 12,8 milhões | 21,4 milhões |
| Requisições por mês | 385 milhões | 641 milhões |
| Média entre 7h e 19h | 208 req/s | 346 req/s |
| **Pico** | **416 req/s** | **693 req/s** |
| vCPUs no pico | 6,7 → **7 tarefas de 1 vCPU** | 11,2 → **12 tarefas de 1 vCPU** |
| vCPUs de madrugada (mínimo para não cair) | 2 | 2 a 3 |
| Tráfego de saída por mês (respostas de ~5 KB) | ~1,9 TB | ~3,2 TB |
| Documentos novos por dia (metade dos atendimentos, 300 KB cada) | 750 mil (~6,8 TB/mês) | 1,25 milhão (~11 TB/mês) |
| Crescimento do banco (atendimento + auditoria, ~2,3 KB por atendimento) | ~3,4 GB/dia (~1,2 TB/ano) | ~5,6 GB/dia (~2 TB/ano) |

**O que muda na infraestrutura:** basta subir o máximo do auto scaling de 3 para ~15 tarefas, com tarefas de 1 vCPU, no `infra/lib/api-stack.ts`. O código da API não muda.

O que muda de verdade é o **banco**. Nessa escala, o MongoDB precisa de um cluster grande ou dividido em partes (*sharding*). O histórico antigo vai para armazenamento mais barato: Online Archive do Atlas, ou S3 Glacier para os documentos.

### 6.3 Custo mensal estimado (US$)

Mesmas referências de preço da seção 5.3 (aproximadas). Os documentos estão calculados no fim do 1º ano. Os arquivos com mais de 90 dias vão para o S3 Glacier Instant Retrieval (US$ 0,004/GB).

| Item | 1,5 milhão/dia | 2,5 milhões/dia | Observação |
|---|---|---|---|
| ECS Fargate (API) | 104 | 157 | ~70 a 106 vCPU-hora por dia |
| Load balancer | 32 | 42 | Inclui as unidades de capacidade (LCU) |
| IPs públicos | 22 | 29 | |
| CloudFront (requisições + tráfego) | 926 | 1.632 | US$ 0,022 a cada 10 mil requisições na América do Sul |
| **MongoDB Atlas** | **~3.200** | **~4.500** | M60 ou cluster dividido, com backup. **É a estimativa mais incerta** |
| **S3 (documentos)** | **~1.000** | **~1.670** | Armazenamento + downloads + envios. Cresce a cada mês |
| CloudWatch | 25 | 35 | |
| Redis (limite de login entre tarefas) | 47 | 47 | 2 nós pequenos |
| WAF (firewall contra ataques) | 240 | 395 | Recomendado em escala nacional |
| **Total por mês** | **~US$ 5.600 (R$ 30.800)** | **~US$ 8.500 (R$ 46.800)** | |
| Otimizado: API direto no load balancer, com domínio próprio, sem CloudFront | ~US$ 4.840 (R$ 26.600) | ~US$ 7.160 (R$ 39.400) | Sem a taxa por requisição do CloudFront |
| **Por ano** | **~R$ 370 mil** | **~R$ 560 mil** | |

### 6.4 Quanto custa cada atendimento

| | 1,5 milhão/dia | 2,5 milhões/dia |
|---|---|---|
| Atendimentos por mês | 45 milhões | 75 milhões |
| **Custo por atendimento** | **R$ 0,0007** (menos de 1 décimo de centavo) | **R$ 0,0006** |
| Custo por 1 milhão de requisições | ~R$ 80 | ~R$ 73 |
| Custo por brasileiro por mês (~203 milhões de habitantes) | R$ 0,00015 | R$ 0,00023 |

### 6.5 Leitura

- **A API não é o problema.** Os servidores da API são só ~2% do custo: 7 a 12 tarefas de 1 vCPU no pico dão conta do país inteiro. O auto scaling medido na seção 3 é o mesmo mecanismo, só com o máximo maior.
- **O custo está nos dados.** O banco é ~53% a 57% do total, e os documentos, cerca de 20%. A conta cresce todo mês, porque prontuário e auditoria não podem ser apagados. A LGPD e as regras do CFM pedem a guarda do prontuário por muitos anos. A política de arquivamento (dados antigos em armazenamento barato) é o que mantém o custo sob controle.
- **Ordem de grandeza:** mesmo no pior caso, com todos os hospitais do Brasil, fica em torno de **R$ 30 a 47 mil por mês**, menos de 1 décimo de centavo por atendimento.
- **Limites desta estimativa:**
  - as premissas de uso (requisições por atendimento, horário de pico, tamanho dos arquivos) são do grupo, não medidas em hospital real;
  - a capacidade por vCPU foi extrapolada da medição local;
  - o preço do Atlas em escala depende de negociação;
  - não entram a equipe, o suporte e a integração com os sistemas dos hospitais.

## 7. Banco de dados e arquivos ao longo de 10 anos (cenário Brasil)

### 7.1 O que a lei permite apagar

| Dado | Pode apagar depois de 5 anos? | Regra |
|---|---|---|
| **Prontuário** (o documento do paciente e o histórico de atendimentos) | **Não** | Lei 13.787/2018, art. 6º: mínimo de **20 anos a partir do último registro**. Para o prontuário nativamente eletrônico, a Resolução CFM 1.821/2007 é lida por parte das fontes como **guarda permanente** |
| **Receitas, laudos e exames anexados** (PDFs) | **Não** | Fazem parte do prontuário: mesma regra |
| **Trilha de auditoria** (quem abriu o prontuário e quando) | **Sim, por política nossa** | Não é prontuário. O Marco Civil da Internet (art. 15) exige pelo menos 6 meses. Escolhemos guardar 5 anos, por segurança e para responder a pedidos com base na LGPD |

**Conclusão:** em 10 anos **nada do prontuário é apagado**. A economia vem de **mover o que é antigo para armazenamento barato** (S3 Glacier), não de descartar. Só a auditoria com mais de 5 anos é apagada.

### 7.2 Como os dados ficam guardados

É o desenho que a API já usa:

- **Um documento por paciente** (coleção `patients`, chave = CPF): alergias, remédios em uso, condições, cirurgias e exames. Ele é **atualizado a cada atendimento** pelo médico que atendeu. Fica sempre no banco, porque é o que o médico abre primeiro.
- **Um registro por atendimento** (coleção `appointments`): data, médico, resumo e lista de documentos. É o histórico.
- **A auditoria** (coleção `audit_logs`): uns 3 registros por atendimento.
- **Os arquivos** (receitas, laudos) ficam no **S3**. O banco guarda só o nome e o código de verificação.

| Idade do dado | Documento do paciente | Atendimentos (histórico) | Auditoria | PDFs |
|---|---|---|---|---|
| 0 a 90 dias | Atlas | Atlas | Atlas | S3 Standard |
| 90 dias a 2,5 anos | Atlas | Atlas | Atlas | S3 Standard-IA (acesso raro) |
| **Mais de 2,5 anos** | **Atlas** (sempre o atual) | **S3 Glacier Instant Retrieval**, em JSON compactado | **S3 Glacier Deep Archive** | **S3 Glacier Instant Retrieval** |
| Mais de 5 anos | Atlas | Glacier | **Apagada** | Glacier |

O Glacier Instant Retrieval devolve o arquivo **na hora** (milissegundos). O médico continua abrindo um exame de 2019 normalmente, só que o armazenamento custa ~6 vezes menos que o S3 comum.

### 7.3 Premissas

| Premissa | Valor |
|---|---|
| Atendimentos por dia | 1,5 milhão (baixo) e 2,5 milhões (alto), como na seção 6 |
| Pacientes cadastrados | 80 milhões no 1º ano, 150 milhões no 5º, 190 milhões no 10º |
| Documento do paciente | 8 KB, crescendo até 10 KB em 10 anos |
| Cada atendimento | 1,5 KB de histórico + 0,75 KB de auditoria |
| PDFs | Metade dos atendimentos gera 1 arquivo de 300 KB |
| Compactação ao arquivar o JSON | O arquivo fica com 30% do tamanho |
| Preço do Atlas (regra de bolso) | **US$ 1,50 por GB por mês de dado no banco**, já com 3 cópias, backup e servidores. Bate com o M60 da seção 6 |
| Preços do S3 (us-east-1) | Standard US$ 0,023/GB · Standard-IA 0,0125 · Glacier Instant Retrieval 0,004 · Glacier Deep Archive 0,00099 |

### 7.4 Resultado ano a ano (cenário baixo: 1,5 milhão de atendimentos por dia)

| Ano | Pacientes | Dados no Atlas | JSON no Glacier | PDFs no S3 | Custo no mês (US$) | **Sem arquivar** (US$) |
|---|---|---|---|---|---|---|
| 1 | 80 mi | 1,9 TB | — | 82 TB | 4.074 | 4.074 |
| 2 | 100 mi | 3,3 TB | — | 164 TB | 7.225 | 7.225 |
| 3 | 120 mi | 4,1 TB | 0,2 TB | 246 TB | 9.115 | 10.388 |
| 5 | 150 mi | 4,4 TB | 0,9 TB | 411 TB | 10.251 | 16.614 |
| 7 | 166 mi | 4,6 TB | 1,4 TB | 575 TB | 11.226 | 22.679 |
| **10** | **190 mi** | **5,0 TB** | **2,2 TB** | **821 TB** | **12.724 (~R$ 70 mil)** | **31.813 (~R$ 175 mil)** |

### 7.5 Resultado ano a ano (cenário alto: 2,5 milhões de atendimentos por dia)

| Ano | Pacientes | Dados no Atlas | JSON no Glacier | PDFs no S3 | Custo no mês (US$) | **Sem arquivar** (US$) |
|---|---|---|---|---|---|---|
| 1 | 80 mi | 2,7 TB | — | 137 TB | 6.134 | 6.134 |
| 2 | 100 mi | 4,9 TB | — | 274 TB | 11.202 | 11.202 |
| 3 | 120 mi | 6,2 TB | 0,3 TB | 411 TB | 14.160 | 16.281 |
| 5 | 150 mi | 6,5 TB | 1,5 TB | 684 TB | 15.736 | 26.340 |
| 7 | 166 mi | 6,7 TB | 2,4 TB | 958 TB | 17.150 | 36.238 |
| **10** | **190 mi** | **7,0 TB** | **3,6 TB** | **1.369 TB** | **19.307 (~R$ 106 mil)** | **51.121 (~R$ 281 mil)** |

"Sem arquivar" significa tudo no Atlas para sempre, a auditoria nunca apagada e os PDFs no S3 Standard-IA.

### 7.6 Total em 10 anos (só banco e arquivos)

| | 1,5 milhão/dia | 2,5 milhões/dia |
|---|---|---|
| **Com arquivamento no Glacier** | **US$ 1,12 milhão (~R$ 6,2 milhões)** | **US$ 1,72 milhão (~R$ 9,5 milhões)** |
| Sem arquivamento | US$ 1,99 milhão (~R$ 10,9 milhões) | US$ 3,17 milhões (~R$ 17,4 milhões) |
| **Economia** | **44%** | **46%** |
| Média por mês ao longo dos 10 anos | ~R$ 51 mil | ~R$ 79 mil |

Fora isso, a API (servidores, load balancer, CloudFront, firewall) soma ~US$ 1.400 a 2.300 por mês (seção 6.3). Esse valor quase não muda com o tempo, porque depende do movimento e não do histórico.

### 7.7 Leitura

- **O banco para de crescer depois de 2,5 anos.** Com o arquivamento, o Atlas estabiliza em **5 a 7 TB**. Só os documentos dos pacientes e os 2,5 anos mais recentes ficam nele. Sem arquivar, ele chega a **14 a 22 TB** em 10 anos, e o custo do banco fica cerca de 3 vezes maior.
- **O que mais cresce são os PDFs**, que chegam a 800 TB a 1,4 PB em 10 anos e a 40% a 45% do custo no 10º ano. Medidas possíveis:
  - **Glacier Deep Archive para PDFs com mais de 5 anos.** Custa 4 vezes menos que o Instant Retrieval, mas o arquivo demora até 12 h para ser devolvido. Economiza cerca de **US$ 1.200 por mês no 10º ano** (cenário baixo).
  - **Comprimir as imagens dos exames** antes de guardar. Muitos PDFs escaneados passam de 1 MB e cairiam para 200 a 300 KB.
- **Custo de leitura do Glacier:** o médico abrir um exame antigo custa US$ 0,03 por GB. Mesmo que 1% do arquivo seja lido por mês, dá menos de US$ 200 por mês no 10º ano.
- **Precisão:** os números dependem muito do tamanho médio dos PDFs e de quantos atendimentos geram arquivo. O preço do Atlas em escala é uma regra de bolso; no mundo real ele seria negociado.

## 8. E se fosse infraestrutura própria? E quão realista é essa conta?

### 8.1 As duas infraestruturas dedicadas

Separando como o grupo propôs:

- **Infra de dados:** banco e arquivos.
- **Infra da aplicação:** API e site.

Cada uma precisa existir em **2 data centers**, um principal e um de contingência. Um sistema de saúde nacional não pode parar nem perder dado se um prédio pegar fogo ou ficar sem energia.

| Infra | O que tem em cada data center | Equivale na AWS a |
|---|---|---|
| **Dados** | 3 servidores de banco com SSD NVMe (MongoDB em réplica). Armazenamento de objetos próprio (servidores com dezenas de HDs, software tipo Ceph ou MinIO) para os PDFs: ~1 PB útil no cenário baixo e ~1,7 PB no alto, em 10 anos. **Biblioteca de fitas LTO** no data center de contingência, para a cópia de segurança e o arquivo antigo | Atlas, S3 e Glacier |
| **Aplicação** | 3 servidores para a API e o site, um par de firewalls/balanceadores, switches, 2 links de internet e proteção contra ataques DDoS | ECS Fargate, load balancer, CloudFront e WAF |

**A infra da aplicação é pequena:** no pico, o país inteiro precisa de 7 a 12 vCPUs (seção 6.2), o que cabe em 3 servidores comuns. **A infra de dados é a grande:** os PDFs passam de 1 PB em 10 anos.

### 8.2 Custo total em 10 anos: nuvem x infraestrutura própria (R$ milhões)

Para comparar de forma justa, os dois lados recebem o que um sistema real precisa:
- contingência em outro lugar;
- dados no Brasil (região São Paulo);
- suporte do fornecedor;
- equipe;
- segurança.

| Item | Nuvem: 1,5 mi/dia | Nuvem: 2,5 mi/dia | Própria: 1,5 mi/dia | Própria: 2,5 mi/dia |
|---|---|---|---|---|
| Banco e arquivos (seção 7) | 6,2 | 9,5 | — | — |
| API, site, CDN, firewall | 0,9 | 1,5 | — | — |
| Contingência em outra região | 2,2 | 3,3 | (incluída nos 2 data centers) | (incluída) |
| Região São Paulo (~35% mais cara que a Virgínia) | 2,5 | 3,9 | — | — |
| Suporte do fornecedor (~7% da conta) | 0,8 | 1,3 | — | — |
| Equipamentos (comprados no ano 1 e trocados no ano 5) | — | — | 4,9 | 5,6 |
| Contratos de manutenção dos equipamentos (~10% ao ano) | — | — | 2,4 | 2,8 |
| Aluguel de espaço em data center (*colocation*, ~R$ 12 mil por rack por mês) | — | — | 7,2 (5 racks) | 8,6 (6 racks) |
| Links de internet (2 por site) e enlace entre os sites | — | — | 6,6 | 6,6 |
| Proteção contra DDoS | — | — | 1,8 | 1,8 |
| **Subtotal de infraestrutura** | **12,6** | **19,4** | **22,9** | **25,5** |
| Equipe de operação (salário + encargos, R$ 18 mil/pessoa) | 19,4 (5 pessoas) | 19,4 | 38,9 (10 pessoas, plantão 24 h) | 38,9 |
| Segurança e conformidade (pentest, SIEM, ISO 27001, LGPD) | 6,0 | 6,0 | 6,0 | 6,0 |
| **Total em 10 anos** | **~R$ 38 milhões** | **~R$ 45 milhões** | **~R$ 68 milhões** | **~R$ 70 milhões** |
| **Média por mês** | **~R$ 317 mil** | **~R$ 374 mil** | **~R$ 565 mil** | **~R$ 586 mil** |

**Por que a infraestrutura própria sai mais cara aqui:**

- **Equipamento é a menor parte:** ~R$ 5 milhões em 10 anos. O que pesa é tudo em volta: espaço com energia e refrigeração, links redundantes, contratos de manutenção e, principalmente, **gente de plantão 24 h**, porque disco queima de madrugada.
- **Na nuvem, a AWS e o Atlas fazem parte desse trabalho.** A equipe cai de ~10 para ~5 pessoas.
- **Estas premissas são as que mais mudam o resultado:** salário (R$ 18 mil + 80% de encargos), aluguel de rack e preço por TB (US$ 150 por TB útil, servidores comuns com software livre).

### 8.3 E só os arquivos em infraestrutura própria (híbrido)?

Os PDFs são o que mais cresce. Mas tirar só eles da nuvem **não compensa**:

| | 1,5 mi/dia | 2,5 mi/dia |
|---|---|---|
| PDFs na nuvem em 10 anos (São Paulo) | ~R$ 3,0 milhões | ~R$ 5,1 milhões |
| PDFs em armazenamento próprio + fitas, com 2 racks por site, enlace e 3 pessoas de plantão | ~R$ 20,6 milhões | ~R$ 21,2 milhões |

Com 1 a 1,7 PB, o Glacier é barato demais para valer a pena montar uma operação de armazenamento só para isso.

### 8.4 Quando a infraestrutura própria compensa

**1. Quando o data center já existe e já está pago.** É o caso de órgãos como DATASUS, Serpro ou Dataprev:
- sem aluguel de espaço;
- links e proteção já contratados;
- equipe compartilhada (+4 pessoas em vez de 10).

Nesse caso a conta cai para **~R$ 33 a 35 milhões em 10 anos**: equipamentos, manutenção, energia, enlace de contingência, 4 pessoas e segurança. **Fica parecida com a nuvem, ou um pouco mais barata.**

**2. Quando a escala é muito maior:**
- vários petabytes por ano;
- milhares de servidores ligados o tempo todo;
- exigência de soberania de dados que impeça a nuvem pública.

Para o tamanho deste projeto, **a nuvem é a escolha mais barata e mais simples**. A arquitetura também permite migrar no futuro sem reescrever a API: MongoDB e um armazenamento compatível com S3 (MinIO, Ceph) rodam em qualquer lugar.

### 8.5 Esta conta é realista?

**Em parte.** As seções 5 a 7 calculam **só a infraestrutura**, com preços de referência:
- a conta de nuvem em si (máquinas, banco, armazenamento) está na **ordem de grandeza certa**;
- **o custo real de operar um sistema desse tamanho é de 4 a 5 vezes maior**.

| | Seções 6 e 7 (só infra, Virgínia) | Seção 8 (operação realista, nuvem) |
|---|---|---|
| 10 anos | R$ 7 a 11 milhões | **R$ 38 a 45 milhões** |
| Por mês | R$ 59 a 92 mil | **R$ 317 a 374 mil** |
| Por atendimento | ~R$ 0,0012 a 0,0013 | **~R$ 0,005 a 0,007** (menos de 1 centavo) |

**O que a seção 8 acrescentou:**
- região São Paulo;
- contingência;
- suporte do fornecedor;
- equipe de operação, que é **mais da metade do custo**;
- segurança e conformidade.

**O que ainda fica de fora** (e num projeto real pode ser maior que tudo acima):
- equipe de **desenvolvimento** contínuo do sistema;
- **integração com os sistemas dos hospitais** (padrões HL7/FHIR, um a um);
- **suporte ao usuário** (central de atendimento para médicos e pacientes) e treinamento;
- jurídico e encarregado de dados da LGPD (DPO);
- certificados digitais ICP-Brasil para assinar receitas.

**Resumo:** a infraestrutura de nuvem para o Brasil inteiro custaria algo como **R$ 60 a 90 mil por mês**. Operar de verdade, com equipe, contingência e segurança, fica perto de **R$ 300 a 400 mil por mês**. Em qualquer dos casos, é **menos de 1 centavo por atendimento**.

## 9. Conclusão

- O **auto scaling e o load balancer funcionam**:
  - a API sobe e desce sozinha conforme a carga;
  - a vazão cresce na proporção do número de tarefas;
  - depois da correção do keep-alive, os erros foram zero.
- **O ponto de melhoria** é a distribuição desigual da carga entre as tarefas. Ela tem solução simples (seção 4) e ainda precisa ser testada.
- **Para 1 milhão de pacientes, a estimativa é de ~R$ 2.800 por mês** (~R$ 1.450 com as otimizações): menos de **R$ 0,003 por paciente por mês**, ou **~R$ 140 por milhão de requisições**. O maior custo é o banco de dados, não os servidores da API.
- **No cenário Brasil inteiro (1,5 a 2,5 milhões de atendimentos por dia), a estimativa é de R$ 30 a 47 mil por mês**, menos de R$ 0,001 por atendimento (seção 6).
- **Em 10 anos, banco e arquivos custam ~R$ 6,2 a 9,5 milhões no total.** Mover para o Glacier o que tem mais de 2,5 anos economiza **44% a 46%** sem apagar nenhum dado do prontuário. A lei exige guardar o prontuário por no mínimo 20 anos, e só a auditoria pode ser apagada aos 5 (seção 7).
- **Operação realista em 10 anos:** ~R$ 38 a 45 milhões na nuvem (~R$ 317 a 374 mil por mês) contra ~R$ 68 a 70 milhões em infraestrutura própria. A infraestrutura própria só empata quando o data center e a equipe já existem, como num órgão público (seção 8).
