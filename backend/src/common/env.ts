import { existsSync } from 'node:fs'

/**
 * Carrega o arquivo .env para os scripts que rodam fora do Nest (seed, dev:memory).
 * Variáveis já definidas no ambiente têm prioridade sobre o arquivo.
 */
export function loadEnvFile(path = '.env') {
  if (existsSync(path)) process.loadEnvFile(path)
}
