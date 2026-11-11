// Nomes e valores fixos da infraestrutura (um lugar só para mudar).

/**
 * Virgínia do Norte. A conta foi criada no "novo cadastro da AWS" (projetos), que só libera
 * us-east-1, us-west-2 e a região escolhida no projeto; São Paulo (sa-east-1) é bloqueada
 * por uma SCP gerenciada pela AWS. Também é a região mais barata (ALB e Fargate).
 */
export const REGION = 'us-east-1'

export const PROJECT = 'saude-unificada'

/**
 * Segredos guardados no SSM Parameter Store como SecureString (gratuito no nível padrão).
 * São criados uma vez pela AWS CLI (ver docs/infraestrutura.md), nunca ficam no código.
 */
export const SSM_PARAMS = {
  mongodbUri: `/${PROJECT}/mongodb-uri`,
  jwtSecret: `/${PROJECT}/jwt-secret`,
}

/** Header que o CloudFront manda para o load balancer; sem ele o ALB responde 403 */
export const ORIGIN_VERIFY_HEADER = 'X-Origin-Verify'

/** Tamanho de cada tarefa da API (0,25 vCPU e 512 MB: o menor que o Fargate oferece) */
export const TASK_SIZE = { cpu: 256, memoryMiB: 512 }

/** Auto scaling: mínimo, máximo e a CPU média que o ECS tenta manter */
export const SCALING = { min: 1, max: 3, targetCpuPercent: 50 }
