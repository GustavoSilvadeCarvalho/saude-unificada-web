// Regras de arquivo enviado (receitas, laudos, exames).

/** Limite de tamanho por arquivo */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export interface DetectedFileType {
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'
  extension: '.pdf' | '.jpg' | '.png'
}

/**
 * Descobre o tipo pelo conteúdo (os primeiros bytes), não pelo nome nem pelo Content-Type,
 * que o cliente pode mandar errado ou forjar (ex.: um .exe renomeado para .pdf).
 */
export function detectFileType(content: Buffer): DetectedFileType | null {
  const starts = (bytes: number[]) => bytes.every((byte, i) => content[i] === byte)
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return { mimeType: 'application/pdf', extension: '.pdf' } // %PDF-
  if (starts([0xff, 0xd8, 0xff])) return { mimeType: 'image/jpeg', extension: '.jpg' }
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mimeType: 'image/png', extension: '.png' }
  return null
}

/**
 * Nome do arquivo pronto para guardar e mostrar:
 * - o multer entrega o nome em latin1, então "laudo_cardiológico.pdf" chega como "laudo_cardiolÃ³gico.pdf";
 * - remove pastas ("C:\\fakepath\\x.pdf"), caracteres de controle e limita o tamanho.
 */
export function cleanFileName(original: string, fallbackExtension: string): string {
  // Só tenta converter se o texto parece latin1 (nenhum caractere acima de 0xFF);
  // se a conversão gerar caractere inválido, o nome já estava certo (cliente mandou em UTF-8)
  const looksLatin1 = [...original].every((char) => char.charCodeAt(0) <= 0xff)
  const decoded = looksLatin1 ? Buffer.from(original, 'latin1').toString('utf8') : original
  const name = decoded.includes('\uFFFD') ? original : decoded
  const base = name
    .split(/[\\/]/)
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
  if (!base || base === '.' || base === '..') return `documento${fallbackExtension}`
  if (base.length <= 150) return base
  const dot = base.lastIndexOf('.')
  const extension = dot > 0 && base.length - dot <= 6 ? base.slice(dot) : ''
  return base.slice(0, 150 - extension.length) + extension
}
