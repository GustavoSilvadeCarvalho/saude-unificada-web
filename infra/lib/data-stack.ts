import * as cdk from 'aws-cdk-lib'
import * as budgets from 'aws-cdk-lib/aws-budgets'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions'
import type { Construct } from 'constructs'
import { PROJECT } from './config.js'

export interface DataStackProps extends cdk.StackProps {
  /** E-mail que recebe os alarmes e os avisos de orçamento */
  alertEmail?: string
  /** Teto mensal de gastos em dólar (o orçamento do projeto) */
  budgetUsd: number
}

/**
 * O que fica de pé entre as sessões de teste e custa quase nada:
 * - bucket S3 dos documentos (receitas, laudos);
 * - tópico de alertas (e-mail);
 * - orçamento com aviso por e-mail.
 * A parte cara (ALB, contêineres, CloudFront) fica na ApiStack, que sobe e desce sob demanda.
 */
export class DataStack extends cdk.Stack {
  readonly documentsBucket: s3.Bucket
  readonly alertsTopic: sns.Topic

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props)

    this.documentsBucket = new s3.Bucket(this, 'Documents', {
      // Privado: o download é sempre por URL pré-assinada de 5 minutos gerada pela API
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [{ abortIncompleteMultipartUploadAfter: cdk.Duration.days(1) }],
      // Projeto acadêmico: o "cdk destroy" final apaga o bucket e os arquivos de teste
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    this.alertsTopic = new sns.Topic(this, 'Alerts', { displayName: 'Saúde Unificada - alertas' })
    if (props.alertEmail) {
      this.alertsTopic.addSubscription(new subscriptions.EmailSubscription(props.alertEmail))
    }

    // Orçamento: avisa por e-mail aos 50%, 80% e 100% do teto, e se a previsão do mês passar do teto
    if (props.alertEmail) {
      const subscribers = [{ subscriptionType: 'EMAIL', address: props.alertEmail }]
      const notify = (threshold: number, notificationType: 'ACTUAL' | 'FORECASTED') => ({
        notification: { comparisonOperator: 'GREATER_THAN', threshold, thresholdType: 'PERCENTAGE', notificationType },
        subscribers,
      })
      new budgets.CfnBudget(this, 'Budget', {
        budget: {
          budgetName: `${PROJECT}-teto`,
          budgetType: 'COST',
          timeUnit: 'MONTHLY',
          budgetLimit: { amount: props.budgetUsd, unit: 'USD' },
        },
        notificationsWithSubscribers: [
          notify(50, 'ACTUAL'),
          notify(80, 'ACTUAL'),
          notify(100, 'ACTUAL'),
          notify(100, 'FORECASTED'),
        ],
      })
    }

    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: this.documentsBucket.bucketName,
      description: 'Bucket dos documentos (S3_BUCKET)',
    })
  }
}
