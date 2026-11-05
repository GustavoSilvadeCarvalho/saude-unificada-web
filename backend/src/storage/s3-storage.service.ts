import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  contentDisposition,
  type DownloadLink,
  type DownloadOptions,
  DOWNLOAD_LINK_TTL_SECONDS,
  StorageService,
} from './storage.service.js'

export interface S3StorageConfig {
  bucket: string
  region: string
  /** Só para testar com um S3 compatível (MinIO, LocalStack); na AWS fica vazio */
  endpoint?: string
}

/**
 * Driver de produção: bucket S3 privado, com criptografia no servidor.
 * As credenciais NÃO ficam no código nem no .env: o SDK usa a role da tarefa ECS/EC2
 * (ou o perfil da AWS CLI na máquina de quem desenvolve).
 * O download é uma URL pré-assinada de 5 minutos: o arquivo vai direto do S3 para o usuário.
 */
export class S3StorageService extends StorageService {
  readonly driver = 's3' as const
  private readonly client: S3Client

  constructor(
    private readonly config: S3StorageConfig,
    client?: S3Client,
  ) {
    super()
    this.client =
      client ??
      new S3Client({
        region: config.region,
        ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
      })
  }

  async put(key: string, body: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
      }),
    )
  }

  async downloadLink(key: string, options: DownloadOptions): Promise<DownloadLink> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ResponseContentType: options.mimeType,
      ResponseContentDisposition: contentDisposition(options.fileName),
    })
    const url = await getSignedUrl(this.client, command, { expiresIn: DOWNLOAD_LINK_TTL_SECONDS })
    return { url, expiresAt: new Date(Date.now() + DOWNLOAD_LINK_TTL_SECONDS * 1000).toISOString() }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }))
  }
}
