import { createHmac } from 'node:crypto'
import { LocalStorageService } from './local-storage.service.js'
import { S3StorageService } from './s3-storage.service.js'
import type { StorageService } from './storage.service.js'

type Env = Record<string, string | undefined>

/**
 * Cria o armazenamento a partir das variáveis de ambiente.
 * Fica fora do Nest de propósito: o seed (npm run seed / dev:memory) usa o mesmo código.
 */
export function createStorage(env: Env): StorageService {
  const driver = env.STORAGE_DRIVER ?? 'local'

  if (driver === 's3') {
    if (!env.S3_BUCKET || !env.AWS_REGION) {
      throw new Error('STORAGE_DRIVER=s3 exige S3_BUCKET e AWS_REGION.')
    }
    return new S3StorageService({ bucket: env.S3_BUCKET, region: env.AWS_REGION, endpoint: env.S3_ENDPOINT })
  }

  if (driver === 'local') {
    const secret = env.FILE_SIGNING_SECRET ?? (env.JWT_SECRET && deriveSecret(env.JWT_SECRET))
    if (!secret) throw new Error('Defina JWT_SECRET (ou FILE_SIGNING_SECRET) para assinar os links de download.')
    return new LocalStorageService(env.UPLOAD_DIR ?? 'uploads', secret)
  }

  throw new Error(`STORAGE_DRIVER inválido: "${driver}". Use local ou s3.`)
}

/** Segredo próprio para os links, derivado do JWT_SECRET (um link nunca vale como token de login) */
function deriveSecret(jwtSecret: string): string {
  return createHmac('sha256', jwtSecret).update('saude-unificada:file-download').digest('hex')
}
