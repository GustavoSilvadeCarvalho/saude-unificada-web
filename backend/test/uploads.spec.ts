import { cleanFileName, detectFileType } from '../src/common/uploads.js'
import { demoPdf } from '../src/database/demo-pdf.js'
import { contentDisposition } from '../src/storage/storage.service.js'

describe('Arquivos enviados', () => {
  describe('detectFileType (pelo conteúdo)', () => {
    it('reconhece PDF, JPG e PNG', () => {
      expect(detectFileType(demoPdf('Teste', []))?.mimeType).toBe('application/pdf')
      expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]))?.mimeType).toBe('image/jpeg')
      expect(detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mimeType).toBe('image/png')
    })

    it('recusa outros formatos, mesmo com nome de PDF', () => {
      expect(detectFileType(Buffer.from('MZ\x90\x00 executável'))).toBeNull() // .exe
      expect(detectFileType(Buffer.from('<html><script>alert(1)</script>'))).toBeNull()
      expect(detectFileType(Buffer.from('PK\x03\x04'))).toBeNull() // .zip / .docx
      expect(detectFileType(Buffer.alloc(0))).toBeNull()
    })
  })

  describe('cleanFileName', () => {
    it('corrige nome com acento que o multer entrega em latin1', () => {
      const asLatin1 = Buffer.from('laudo_cardiológico.pdf', 'utf8').toString('latin1')
      expect(cleanFileName(asLatin1, '.pdf')).toBe('laudo_cardiológico.pdf')
    })

    it('mantém nome que já veio certo em UTF-8', () => {
      expect(cleanFileName('receita_ação.pdf', '.pdf')).toBe('receita_ação.pdf')
      expect(cleanFileName('laudo — revisão.pdf', '.pdf')).toBe('laudo — revisão.pdf')
    })

    it('remove pastas e caracteres de controle', () => {
      expect(cleanFileName('C:\\fakepath\\exame.png', '.png')).toBe('exame.png')
      expect(cleanFileName('../../etc/passwd', '.pdf')).toBe('passwd')
      expect(cleanFileName('a\u0000b\nc.pdf', '.pdf')).toBe('abc.pdf')
    })

    it('usa um nome padrão quando não sobra nada', () => {
      expect(cleanFileName('', '.pdf')).toBe('documento.pdf')
      expect(cleanFileName('..', '.jpg')).toBe('documento.jpg')
    })

    it('limita o tamanho mantendo a extensão', () => {
      const name = cleanFileName(`${'a'.repeat(300)}.pdf`, '.pdf')
      expect(name).toHaveLength(150)
      expect(name.endsWith('.pdf')).toBe(true)
    })
  })

  it('contentDisposition leva o nome com acento (RFC 5987) e uma versão ASCII', () => {
    expect(contentDisposition('laudo_cardiológico.pdf')).toBe(
      `attachment; filename="laudo_cardiologico.pdf"; filename*=UTF-8''laudo_cardiol%C3%B3gico.pdf`,
    )
  })
})
