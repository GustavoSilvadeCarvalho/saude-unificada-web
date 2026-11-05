/**
 * Gera um PDF simples de uma página (título + linhas de texto), sem biblioteca.
 * Usado só no seed, para os documentos de demonstração poderem ser baixados.
 * Texto em WinAnsiEncoding (aceita acentos do português).
 */
export function demoPdf(title: string, lines: string[]): Buffer {
  // Escapa os caracteres especiais de string em PDF e troca os que não existem em latin1
  const text = (value: string) =>
    toWinAnsi(value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'))

  const content = [
    'BT',
    '/F1 16 Tf',
    '56 780 Td',
    `(${text(title)}) Tj`,
    '/F1 11 Tf',
    '0 -28 Td',
    ...lines.flatMap((line) => [`(${text(line)}) Tj`, '0 -16 Td']),
    'ET',
  ].join('\n')
  const stream = Buffer.from(content, 'latin1')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${stream.length} >>\nstream\n${content}\nendstream`,
  ]

  // Monta o arquivo guardando a posição de cada objeto para a tabela xref
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xrefStart = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

/** Caracteres comuns que o WinAnsi tem, mas fora do latin1 (ex.: o travessão "—") */
const WIN_ANSI_EXTRAS: Record<string, string> = {
  '\u20ac': '\x80', // €
  '\u2026': '\x85', // …
  '\u2018': '\x91', // ‘
  '\u2019': '\x92', // ’
  '\u201c': '\x93', // “
  '\u201d': '\x94', // ”
  '\u2022': '\x95', // •
  '\u2013': '\x96', // –
  '\u2014': '\x97', // —
}

function toWinAnsi(value: string): string {
  return [...value].map((char) => WIN_ANSI_EXTRAS[char] ?? (char.charCodeAt(0) <= 0xff ? char : '?')).join('')
}
