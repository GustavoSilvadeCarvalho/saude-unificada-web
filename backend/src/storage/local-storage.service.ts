import { createHmac, timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import type { Readable } from 'node:stream'
import {
  type DownloadLink,
  type DownloadOptions,
  DOWNLOAD_LINK_TTL_SECONDS,
  StorageService,
} from './storage.service.js'

interface SignedFile {
  key: string
  fileName: string
  mimeType: string
  /** Expira em (segundos desde 1970) */
  exp: number
}

/**
 * Driver de desenvolvimento e testes: grava na pasta UPLOAD_DIR.
 * O link de download aponta para GET /api/files/:token, assinado com HMAC e com validade curta,
 * imitando a URL pré-assinada do S3 (assim o front funciona igual nos dois drivers).
 * Não é stateless (o arquivo fica no disco do servidor): em produção use o driver s3.
 */
export class LocalStorageService extends StorageService {
  readonly driver = 'local' as const
  private readonly root: string

  constructor(
    uploadDir: string,
    private readonly signingSecret: string,
  ) {
    super()
    this.root = resolve(uploadDir)
  }

  async put(key: string, body: Buffer): Promise<void> {
    const path = this.pathOf(key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, body)
  }

  async downloadLink(key: string, options: DownloadOptions): Promise<DownloadLink> {
    const exp = Math.floor(Date.now() / 1000) + DOWNLOAD_LINK_TTL_SECONDS
    const token = this.sign({ key, fileName: options.fileName, mimeType: options.mimeType, exp })
    return {
      url: `${options.apiBaseUrl}/api/files/${token}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true })
  }

  /** Confere a assinatura e a validade do link; devolve null se for inválido ou expirado */
  verify(token: string): SignedFile | null {
    const [payload, signature] = token.split('.')
    if (!payload || !signature) return null
    const expected = this.hmac(payload)
    const given = Buffer.from(signature)
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SignedFile
      return data.exp * 1000 > Date.now() ? data : null
    } catch {
      return null
    }
  }

  /** Abre o arquivo para leitura; null se ele não existir */
  async open(key: string): Promise<{ stream: Readable; size: number } | null> {
    const path = this.pathOf(key)
    try {
      const info = await stat(path)
      return { stream: createReadStream(path), size: info.size }
    } catch {
      return null
    }
  }

  private sign(data: SignedFile): string {
    const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
    return `${payload}.${this.hmac(payload).toString()}`
  }

  private hmac(payload: string): Buffer {
    return Buffer.from(createHmac('sha256', this.signingSecret).update(payload).digest('base64url'))
  }

  /** Caminho no disco, sem deixar a chave sair da pasta (ex.: "../../etc/passwd") */
  private pathOf(key: string): string {
    const path = resolve(this.root, key)
    if (!path.startsWith(this.root + sep)) throw new Error(`Chave de arquivo inválida: ${key}`)
    return path
  }
}
