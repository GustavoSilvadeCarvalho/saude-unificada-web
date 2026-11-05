import { fileURLToPath } from 'node:url'
import * as cdk from 'aws-cdk-lib'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Platform } from 'aws-cdk-lib/aws-ecr-assets'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as logs from 'aws-cdk-lib/aws-logs'
import type * as s3 from 'aws-cdk-lib/aws-s3'
import type * as sns from 'aws-cdk-lib/aws-sns'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'
import { ORIGIN_VERIFY_HEADER, PROJECT, SCALING, SSM_PARAMS, TASK_SIZE } from './config.js'

/** Pasta da API (o Dockerfile dela vira a imagem do contêiner) */
const BACKEND_DIR = fileURLToPath(new URL('../../backend', import.meta.url))

export interface ApiStackProps extends cdk.StackProps {
  documentsBucket: s3.IBucket
  alertsTopic: sns.ITopic
  /** Origens liberadas no CORS (site na Vercel, localhost) */
  corsOrigins: string
  /** Fargate Spot (~70% mais barato, pode ser interrompido) em vez do Fargate normal */
  useSpot: boolean
}

/**
 * A API no ar, pensada para custar pouco e só existir quando precisa (sobe com
 * `npm run deploy`, desce com `npm run destroy:api`):
 *
 *   usuário → CloudFront (HTTPS) → ALB → ECS Fargate (1 a 3 tarefas) → MongoDB Atlas + S3
 *
 * - Sem NAT Gateway (o item mais caro de uma VPC): as tarefas ficam em subnet pública com IP próprio.
 * - CloudFront dá HTTPS de graça (o site na Vercel é HTTPS e não pode chamar API em HTTP).
 * - Auto scaling pela CPU média (1 a 3 tarefas): é a evidência de escalabilidade.
 * - CloudWatch: logs por 7 dias, dashboard e alarmes por e-mail.
 */
export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    // Segredo do header CloudFront → ALB: parte do id da stack (muda a cada deploy, não fica no código)
    const originSecret = cdk.Fn.select(2, cdk.Fn.split('/', this.stackId))

    // ---------- Rede: 2 zonas, só subnets públicas, sem NAT ----------
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [{ name: 'publica', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 }],
    })

    // ---------- Contêineres (ECS Fargate) ----------
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      enableFargateCapacityProviders: true,
      // Container Insights cobra por métrica; as métricas básicas do ECS (CPU, memória) já são grátis
      containerInsightsV2: ecs.ContainerInsights.DISABLED,
    })

    const logGroup = new logs.LogGroup(this, 'Logs', {
      logGroupName: `/${PROJECT}/api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'Task', {
      cpu: TASK_SIZE.cpu,
      memoryLimitMiB: TASK_SIZE.memoryMiB,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
      },
    })

    taskDefinition.addContainer('api', {
      image: ecs.ContainerImage.fromAsset(BACKEND_DIR, { platform: Platform.LINUX_AMD64 }),
      portMappings: [{ containerPort: 3000 }],
      logging: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: 'api' }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        JWT_EXPIRES_IN: '8h',
        CORS_ORIGINS: props.corsOrigins,
        SWAGGER_ENABLED: 'true',
        STORAGE_DRIVER: 's3',
        S3_BUCKET: props.documentsBucket.bucketName,
        AWS_REGION: this.region,
      },
      secrets: {
        MONGODB_URI: ecs.Secret.fromSsmParameter(
          ssm.StringParameter.fromSecureStringParameterAttributes(this, 'MongoUri', {
            parameterName: SSM_PARAMS.mongodbUri,
          }),
        ),
        JWT_SECRET: ecs.Secret.fromSsmParameter(
          ssm.StringParameter.fromSecureStringParameterAttributes(this, 'JwtSecret', {
            parameterName: SSM_PARAMS.jwtSecret,
          }),
        ),
      },
    })

    // A API grava e lê os documentos com a role da tarefa (sem chave de acesso no código)
    props.documentsBucket.grantReadWrite(taskDefinition.taskRole)

    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: SCALING.min,
      assignPublicIp: true, // sem NAT: precisa de IP público para baixar a imagem e falar com o Atlas
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      capacityProviderStrategies: [{ capacityProvider: props.useSpot ? 'FARGATE_SPOT' : 'FARGATE', weight: 1 }],
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true }, // deploy com erro volta sozinho para a versão anterior
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    })

    // ---------- Load balancer (só aceita o que vem do CloudFront) ----------
    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', { vpc, internetFacing: true })
    const listener = alb.addListener('Http', {
      port: 80,
      defaultAction: elbv2.ListenerAction.fixedResponse(403, {
        contentType: 'application/json',
        messageBody: '{"statusCode":403,"message":"Acesse a API pelo endereço do CloudFront."}',
      }),
    })
    const targetGroup = listener.addTargets('Api', {
      priority: 1,
      conditions: [elbv2.ListenerCondition.httpHeader(ORIGIN_VERIFY_HEADER, [originSecret])],
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      deregistrationDelay: cdk.Duration.seconds(10),
      healthCheck: {
        // Não depende do banco: uma queda rápida do Atlas não derruba as tarefas
        path: '/api/health/live',
        interval: cdk.Duration.seconds(15),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    })

    // ---------- Auto scaling: 1 a 3 tarefas pela CPU média ----------
    const scaling = service.autoScaleTaskCount({ minCapacity: SCALING.min, maxCapacity: SCALING.max })
    scaling.scaleOnCpuUtilization('Cpu', {
      targetUtilizationPercent: SCALING.targetCpuPercent,
      scaleOutCooldown: cdk.Duration.seconds(60),
      scaleInCooldown: cdk.Duration.seconds(120),
    })

    // ---------- CloudFront: HTTPS grátis, sem cache (é uma API) ----------
    const distribution = new cloudfront.Distribution(this, 'Cdn', {
      comment: 'Saúde Unificada - API',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL, // inclui pontos de presença no Brasil
      defaultBehavior: {
        origin: new origins.HttpOrigin(alb.loadBalancerDnsName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          customHeaders: { [ORIGIN_VERIFY_HEADER]: originSecret },
          readTimeout: cdk.Duration.seconds(30),
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        // Repassa todos os headers (inclusive Authorization com o token) menos o Host
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
    })

    // ---------- Monitoramento: alarmes por e-mail + dashboard ----------
    const alarmAction = new cwActions.SnsAction(props.alertsTopic)
    const lb = alb.metrics
    const tg = targetGroup.metrics
    const alarms = [
      new cloudwatch.Alarm(this, 'ApiFora', {
        alarmName: `${PROJECT}-api-fora-do-ar`,
        alarmDescription: 'Nenhuma tarefa saudável atrás do load balancer.',
        metric: tg.healthyHostCount({ period: cdk.Duration.minutes(1), statistic: 'Minimum' }),
        threshold: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      }),
      new cloudwatch.Alarm(this, 'Erros5xx', {
        alarmName: `${PROJECT}-erros-5xx`,
        alarmDescription: 'A API respondeu 10 ou mais erros 5xx em 5 minutos.',
        metric: tg.httpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT, { period: cdk.Duration.minutes(5) }),
        threshold: 10,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }),
      new cloudwatch.Alarm(this, 'Lenta', {
        alarmName: `${PROJECT}-resposta-lenta`,
        alarmDescription: 'Tempo de resposta p95 acima de 2 segundos por 5 minutos.',
        metric: tg.targetResponseTime({ period: cdk.Duration.minutes(1), statistic: 'p95' }),
        threshold: 2,
        evaluationPeriods: 5,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }),
      new cloudwatch.Alarm(this, 'CpuNoLimite', {
        alarmName: `${PROJECT}-cpu-no-limite`,
        alarmDescription: 'CPU média acima de 85% por 10 minutos (o auto scaling já pode estar no máximo).',
        metric: service.metricCpuUtilization({ period: cdk.Duration.minutes(1) }),
        threshold: 85,
        evaluationPeriods: 10,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }),
    ]
    for (const alarm of alarms) {
      alarm.addAlarmAction(alarmAction)
      alarm.addOkAction(alarmAction)
    }

    const minute = cdk.Duration.minutes(1)
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${PROJECT}-api`,
      defaultInterval: cdk.Duration.hours(3),
    })
    dashboard.addWidgets(
      new cloudwatch.AlarmStatusWidget({ title: 'Alarmes', alarms, width: 24, height: 3 }),
    )
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Tarefas da API (auto scaling 1 a 3)',
        left: [tg.healthyHostCount({ period: minute, statistic: 'Maximum', label: 'tarefas saudáveis' })],
        leftYAxis: { min: 0, max: SCALING.max + 1 },
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'CPU e memória das tarefas (%)',
        left: [
          service.metricCpuUtilization({ period: minute, label: 'CPU média' }),
          service.metricMemoryUtilization({ period: minute, label: 'memória média' }),
        ],
        leftAnnotations: [{ value: SCALING.targetCpuPercent, label: 'alvo do auto scaling', color: '#d62728' }],
        leftYAxis: { min: 0, max: 100 },
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'Requisições por minuto',
        left: [lb.requestCount({ period: minute, label: 'requisições' })],
        width: 8,
      }),
    )
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Tempo de resposta (s)',
        left: [
          tg.targetResponseTime({ period: minute, statistic: 'p50', label: 'p50' }),
          tg.targetResponseTime({ period: minute, statistic: 'p95', label: 'p95' }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Respostas com erro por minuto',
        left: [
          tg.httpCodeTarget(elbv2.HttpCodeTarget.TARGET_4XX_COUNT, { period: minute, label: '4xx' }),
          tg.httpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT, { period: minute, label: '5xx' }),
        ],
        width: 12,
      }),
    )

    // ---------- Saídas (aparecem no fim do deploy) ----------
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://${distribution.distributionDomainName}/api`,
      description: 'Endereço da API (use no site: VITE_API_URL)',
    })
    new cdk.CfnOutput(this, 'SwaggerUrl', { value: `https://${distribution.distributionDomainName}/api/docs` })
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards/dashboard/${PROJECT}-api`,
    })
    new cdk.CfnOutput(this, 'ClusterName', { value: cluster.clusterName })
    new cdk.CfnOutput(this, 'ServiceName', { value: service.serviceName })
  }
}
