import { createHash, randomBytes } from 'node:crypto'

/**
 * Código de verificação impresso nas receitas, laudos e exames (ex.: K7QM-3XRA-9DPE).
 * Alfabeto Crockford base32: sem I, L, O e U, para não confundir na hora de digitar.
 * 12 caracteres = 60 bits aleatórios: não dá para adivinhar um código válido.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const LENGTH = 12

export const VERIFICATION_CODE_EXAMPLE = 'K7QM-3XRA-9DPE'

export function newVerificationCode(): string {
  const bytes = randomBytes(LENGTH)
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length])
  return format(chars.join(''))
}

/**
 * Aceita o código como a pessoa digitar: minúsculas, sem traços, com espaços,
 * e O/I/L no lugar de 0/1. Devolve undefined se não tiver o formato certo.
 */
export function normalizeVerificationCode(input: string): string | undefined {
  const clean = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  if (clean.length !== LENGTH || [...clean].some((c) => !ALPHABET.includes(c))) return undefined
  return format(clean)
}

/** Impressão digital do arquivo: muda se um único byte for alterado */
export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/** "Maria Aparecida da Silva" → "M. A. S." (identifica sem expor o nome numa rota pública) */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter((part) => part.length > 2)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join(' ')
}

function format(code: string): string {
  return code.match(/.{4}/g)?.join('-') ?? code
}
