// Testes da infraestrutura: geram os templates do CloudFormation (sem conta AWS, sem Docker)
// e conferem as regras de custo, segurança, escalabilidade e monitoramento.
//   npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as cdk from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { ApiStack } from '../lib/api-stack.js'
import { SCALING, SSM_PARAMS } from '../lib/config.js'
import { DataStack } from '../lib/data-stack.js'

function build({ useSpot = true, loginRateLimit = true, alertEmail = 'alertas@exemplo.com' } = {}) {
  const app = new cdk.App({ context: { '@aws-cdk/core:defaultCrossStackReferences': 'strong' } })
  const env = { account: '123456789012', region: 'us-east-1' }
  const data = new DataStack(app, 'Data', { env, alertEmail, budgetUsd: 18 })
  const api = new ApiStack(app, 'Api', {
    env,
    documentsBucket: data.documentsBucket,
    alertsTopic: data.alertsTopic,
    corsOrigins: 'https://saude.vercel.app',
    useSpot,
    loginRateLimit,
  })
  return { data: Template.fromStack(data), api: Template.fromStack(api) }
}

const { data, api } = build()

describe('Custo', () => {
  it('não cria NAT Gateway (o item mais caro de uma VPC)', () => {
    api.resourceCountIs('AWS::EC2::NatGateway', 0)
  })

  it('usa Fargate Spot com a menor tarefa possível (0,25 vCPU e 512 MB)', () => {
    api.hasResourceProperties('AWS::ECS::Service', {
      CapacityProviderStrategy: [{ CapacityProvider: 'FARGATE_SPOT', Weight: 1 }],
    })
    api.hasResourceProperties('AWS::ECS::TaskDefinition', { Cpu: '256', Memory: '512' })
  })

  it('dá para trocar para Fargate normal (ex.: no dia da gravação)', () => {
    const { api: onDemand } = build({ useSpot: false })
    onDemand.hasResourceProperties('AWS::ECS::Service', {
      CapacityProviderStrategy: [{ CapacityProvider: 'FARGATE', Weight: 1 }],
    })
  })

  it('não liga o Container Insights (cobrado por métrica)', () => {
    api.hasResourceProperties('AWS::ECS::Cluster', {
      ClusterSettings: [{ Name: 'containerInsights', Value: 'disabled' }],
    })
  })

  it('guarda os logs por só 7 dias', () => {
    api.hasResourceProperties('AWS::Logs::LogGroup', { RetentionInDays: 7 })
  })

  it('tem orçamento de US$ 18 com avisos aos 50%, 80%, 100% e na previsão', () => {
    data.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: Match.objectLike({ BudgetLimit: { Amount: 18, Unit: 'USD' }, TimeUnit: 'MONTHLY' }),
    })
    const [budget] = Object.values(data.findResources('AWS::Budgets::Budget')) as {
      Properties: { NotificationsWithSubscribers: { Notification: { Threshold: number; NotificationType: string } }[] }
    }[]
    const notifications = budget.Properties.NotificationsWithSubscribers.map(
      (n) => `${n.Notification.NotificationType} ${n.Notification.Threshold}`,
    )
    assert.deepEqual(notifications, ['ACTUAL 50', 'ACTUAL 80', 'ACTUAL 100', 'FORECASTED 100'])
  })
})

/** Variáveis de ambiente do contêiner da API, como objeto */
function containerEnv(template: Template): Record<string, string> {
  const [taskDef] = Object.values(template.findResources('AWS::ECS::TaskDefinition'))
  const vars = taskDef.Properties.ContainerDefinitions[0].Environment as { Name: string; Value: string }[]
  return Object.fromEntries(vars.map((v) => [v.Name, v.Value]))
}

describe('Segurança', () => {
  it('a API confia nos 2 proxies da frente (CloudFront + ALB) para achar o IP do cliente', () => {
    assert.equal(containerEnv(api).TRUST_PROXY, '2')
  })

  it('liga o limite de tentativas de login e só desliga para o teste de carga', () => {
    assert.equal(containerEnv(api).LOGIN_RATE_LIMIT, '5')
    assert.equal(containerEnv(api).LOGIN_RATE_LIMIT_IP, '30')

    const { api: loadTest } = build({ loginRateLimit: false })
    assert.equal(containerEnv(loadTest).LOGIN_RATE_LIMIT, '0')
    assert.equal(containerEnv(loadTest).LOGIN_RATE_LIMIT_IP, '0')
  })

  it('bucket privado, criptografado e só com HTTPS', () => {
    data.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }],
      },
    })
    data.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Effect: 'Deny', Condition: { Bool: { 'aws:SecureTransport': 'false' } } }),
        ]),
      },
    })
  })

  it('segredos vêm do SSM Parameter Store, não do código', () => {
    const [task] = Object.values(api.findResources('AWS::ECS::TaskDefinition')) as {
      Properties: { ContainerDefinitions: { Secrets: { Name: string; ValueFrom: unknown }[]; Environment: { Name: string }[] }[] }
    }[]
    const container = task.Properties.ContainerDefinitions[0]
    assert.deepEqual(container.Secrets.map((s) => s.Name).sort(), ['JWT_SECRET', 'MONGODB_URI'])
    assert.ok(JSON.stringify(container.Secrets).includes(SSM_PARAMS.mongodbUri.slice(1)))
    const envNames = container.Environment.map((e) => e.Name)
    assert.ok(!envNames.includes('MONGODB_URI') && !envNames.includes('JWT_SECRET'))
  })

  it('não cria chave de acesso (a API usa a role da tarefa para o S3)', () => {
    api.resourceCountIs('AWS::IAM::AccessKey', 0)
    data.resourceCountIs('AWS::IAM::AccessKey', 0)
    api.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike({ Action: Match.arrayWith(['s3:PutObject']) })]),
      },
    })
  })

  it('o load balancer só aceita requisições que vêm do CloudFront (header secreto)', () => {
    api.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      DefaultActions: [Match.objectLike({ Type: 'fixed-response', FixedResponseConfig: Match.objectLike({ StatusCode: '403' }) })],
    })
    api.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerRule', {
      Conditions: [Match.objectLike({ Field: 'http-header', HttpHeaderConfig: Match.objectLike({ HttpHeaderName: 'X-Origin-Verify' }) })],
    })
  })

  it('CloudFront força HTTPS, não guarda cache e repassa o token (Authorization)', () => {
    api.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: 'redirect-to-https',
          CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad', // Managed-CachingDisabled
          OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac', // Managed-AllViewerExceptHostHeader
        }),
      }),
    })
  })
})

describe('Escalabilidade', () => {
  it(`auto scaling de ${SCALING.min} a ${SCALING.max} tarefas pela CPU média de ${SCALING.targetCpuPercent}%`, () => {
    api.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
      MinCapacity: SCALING.min,
      MaxCapacity: SCALING.max,
    })
    api.hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
      PolicyType: 'TargetTrackingScaling',
      TargetTrackingScalingPolicyConfiguration: Match.objectLike({
        TargetValue: SCALING.targetCpuPercent,
        PredefinedMetricSpecification: { PredefinedMetricType: 'ECSServiceAverageCPUUtilization' },
      }),
    })
  })

  it('health check no /api/health/live (não depende do banco)', () => {
    api.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      HealthCheckPath: '/api/health/live',
    })
  })

  it('o destroy apaga o serviço antes de soltar o Fargate do cluster', () => {
    const [association] = Object.keys(api.findResources('AWS::ECS::ClusterCapacityProviderAssociations'))
    const [service] = Object.values(api.findResources('AWS::ECS::Service'))
    assert.ok(association)
    assert.ok(service.DependsOn.includes(association))
  })

  it('deploy com erro volta sozinho para a versão anterior', () => {
    api.hasResourceProperties('AWS::ECS::Service', {
      DeploymentConfiguration: Match.objectLike({ DeploymentCircuitBreaker: { Enable: true, Rollback: true } }),
    })
  })
})

describe('Monitoramento', () => {
  it('4 alarmes, todos avisando por e-mail (SNS) ao disparar e ao normalizar', () => {
    const alarms = Object.values(api.findResources('AWS::CloudWatch::Alarm')) as {
      Properties: { AlarmName: string; AlarmActions: unknown[]; OKActions: unknown[] }
    }[]
    assert.equal(alarms.length, 4)
    for (const alarm of alarms) {
      assert.equal(alarm.Properties.AlarmActions.length, 1, alarm.Properties.AlarmName)
      assert.equal(alarm.Properties.OKActions.length, 1, alarm.Properties.AlarmName)
    }
  })

  it('dashboard da API no CloudWatch', () => {
    api.hasResourceProperties('AWS::CloudWatch::Dashboard', { DashboardName: 'saude-unificada-api' })
  })

  it('e-mail de alerta inscrito no tópico', () => {
    data.hasResourceProperties('AWS::SNS::Subscription', { Protocol: 'email', Endpoint: 'alertas@exemplo.com' })
  })

  it('sem e-mail informado, não cria inscrição nem orçamento (deploy não quebra)', () => {
    const { data: noEmail } = build({ alertEmail: '' })
    noEmail.resourceCountIs('AWS::SNS::Subscription', 0)
    noEmail.resourceCountIs('AWS::Budgets::Budget', 0)
  })
})
