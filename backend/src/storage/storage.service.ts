/** Dados para gerar o link de download */
export interface DownloadOptions {
  /** Nome sugerido ao salvar o arquivo */
  fileName: string
  mimeType: string
  /** Endereço público da API (ex.: http://localhost:3000), usado pelo driver local */
  apiBaseUrl: string
}

export interface DownloadLink {
  url: string
  expiresAt: string
}

/** Por quanto tempo um link de download vale */
export const DOWNLOAD_LINK_TTL_SECONDS = 5 * 60

/**
 * Onde os arquivos (receitas, laudos, exames) ficam guardados.
 * Escolhido por STORAGE_DRIVER: "local" (pasta UPLOAD_DIR, desenvolvimento e testes)
 * ou "s3" (bucket privado na AWS, produção). O resto da API só conhece esta interface.
 */
export abstract class StorageService {
  abstract readonly driver: 'local' | 's3'

  /** Grava o arquivo na chave informada (ex.: appointments/<id>/<uuid>.pdf) */
  abstract put(key: string, body: Buffer, mimeType: string): Promise<void>

  /** Link temporário para baixar o arquivo, sem precisar do token da API */
  abstract downloadLink(key: string, options: DownloadOptions): Promise<DownloadLink>

  /** Apaga o arquivo (usado para desfazer um upload que falhou no meio) */
  abstract delete(key: string): Promise<void>
}

/** Content-Disposition com o nome original, inclusive com acentos (RFC 6266 / 5987) */
export function contentDisposition(fileName: string): string {
  const ascii = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]|["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}
