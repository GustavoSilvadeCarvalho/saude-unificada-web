import * as cdk from 'aws-cdk-lib'
import { ApiStack } from '../lib/api-stack.js'
import { PROJECT, REGION } from '../lib/config.js'
import { DataStack } from '../lib/data-stack.js'

// Infraestrutura da Saúde Unificada na AWS (região us-east-1, Virgínia do Norte).
//   npm run deploy -- -c alertEmail=voce@email.com      sobe tudo
//   npm run destroy:api                                  derruba só a parte que custa por hora
//   npm run destroy:all                                  apaga tudo (fim do projeto)

const app = new cdk.App()
const context = (key: string) => app.node.tryGetContext(key)

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: REGION }
const tags = { projeto: PROJECT, ambiente: 'demonstracao' }

const data = new DataStack(app, 'SaudeUnificadaData', {
  env,
  description: 'Saúde Unificada: S3 dos documentos, alertas e orçamento (fica de pé entre as sessões)',
  alertEmail: context('alertEmail') || undefined,
  budgetUsd: Number(context('budgetUsd') ?? 18),
})

new ApiStack(app, 'SaudeUnificadaApi', {
  env,
  description: 'Saúde Unificada: API (CloudFront, ALB, ECS Fargate com auto scaling, CloudWatch)',
  documentsBucket: data.documentsBucket,
  alertsTopic: data.alertsTopic,
  corsOrigins: String(context('corsOrigins') ?? 'http://localhost:5173'),
  useSpot: String(context('useSpot') ?? 'true') !== 'false',
  // Só no teste de carga (muitos logins seguidos do mesmo IP): -c loginRateLimit=false
  loginRateLimit: String(context('loginRateLimit') ?? 'true') !== 'false',
})

for (const [key, value] of Object.entries(tags)) cdk.Tags.of(app).add(key, value)
