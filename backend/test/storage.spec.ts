import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { text } from 'node:stream/consumers'
import { S3Client } from '@aws-sdk/client-s3'
import { LocalStorageService } from '../src/storage/local-storage.service.js'
import { S3StorageService } from '../src/storage/s3-storage.service.js'
import { createStorage } from '../src/storage/storage.factory.js'

const options = { fileName: 'receita_ação.pdf', mimeType: 'application/pdf', apiBaseUrl: 'http://localhost:3000' }

describe('Armazenamento de arquivos', () => {
  describe('driver local', () => {
    let dir: string
    let storage: LocalStorageService

    beforeAll(async () => {
      dir = await mkdtemp(join(tmpdir(), 'storage-spec-'))
      storage = new LocalStorageService(dir, 'segredo-de-teste')
    })

    afterAll(async () => {
      await rm(dir, { recursive: true, force: true })
    })

    it('grava, lê e apaga o arquivo', async () => {
      await storage.put('appointments/a1/doc.pdf', Buffer.from('%PDF-conteúdo'))
      const opened = await storage.open('appointments/a1/doc.pdf')
      expect(await text(opened!.stream)).toBe('%PDF-conteúdo')

      await storage.delete('appointments/a1/doc.pdf')
      expect(await storage.open('appointments/a1/doc.pdf')).toBeNull()
    })

    it('não deixa a chave sair da pasta de uploads', async () => {
      await expect(storage.put('../fora.pdf', Buffer.from('x'))).rejects.toThrow('Chave de arquivo inválida')
    })

    it('gera link assinado que vale 5 minutos', async () => {
      const link = await storage.downloadLink('appointments/a1/doc.pdf', options)
      const token = link.url.split('/api/files/')[1]

      expect(link.url.startsWith('http://localhost:3000/api/files/')).toBe(true)
      expect(storage.verify(token)).toMatchObject({ key: 'appointments/a1/doc.pdf', fileName: 'receita_ação.pdf' })
      expect(new Date(link.expiresAt).getTime() - Date.now()).toBeGreaterThan(4 * 60 * 1000)
    })

    it('recusa link adulterado, assinado com outro segredo ou expirado', async () => {
      const { url } = await storage.downloadLink('appointments/a1/doc.pdf', options)
      const token = url.split('/api/files/')[1]
      const [payload, signature] = token.split('.')
      const forgedPayload = Buffer.from(JSON.stringify({ key: '../../segredo', exp: 9999999999 })).toString('base64url')

      expect(storage.verify(`${forgedPayload}.${signature}`)).toBeNull()
      expect(storage.verify(`${payload}.assinatura-falsa`)).toBeNull()
      expect(new LocalStorageService(dir, 'outro-segredo').verify(token)).toBeNull()
      expect(storage.verify('lixo')).toBeNull()

      vi.useFakeTimers({ now: Date.now() + 6 * 60 * 1000 })
      expect(storage.verify(token)).toBeNull()
      vi.useRealTimers()
    })
  })

  describe('driver s3', () => {
    const client = new S3Client({
      region: 'sa-east-1',
      credentials: { accessKeyId: 'AKIATESTE', secretAccessKey: 'segredo-de-teste' },
    })
    const storage = new S3StorageService({ bucket: 'saude-unificada-docs', region: 'sa-east-1' }, client)

    it('gera URL pré-assinada de 5 minutos, com o nome original para download', async () => {
      const link = await storage.downloadLink('appointments/a1/doc.pdf', options)
      const url = new URL(link.url)

      expect(url.host).toBe('saude-unificada-docs.s3.sa-east-1.amazonaws.com')
      expect(url.pathname).toBe('/appointments/a1/doc.pdf')
      expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
      expect(url.searchParams.get('response-content-type')).toBe('application/pdf')
      expect(url.searchParams.get('response-content-disposition')).toContain("filename*=UTF-8''receita_a%C3%A7%C3%A3o.pdf")
    })

    it('grava com criptografia no servidor (AES256) e o tipo do arquivo', async () => {
      const send = vi.spyOn(client, 'send').mockResolvedValue({} as never)
      await storage.put('appointments/a1/doc.pdf', Buffer.from('%PDF-'), 'application/pdf')

      const input = (send.mock.calls[0][0] as unknown as { input: Record<string, unknown> }).input
      expect(input).toMatchObject({
        Bucket: 'saude-unificada-docs',
        Key: 'appointments/a1/doc.pdf',
        ContentType: 'application/pdf',
        ServerSideEncryption: 'AES256',
      })
      send.mockRestore()
    })
  })

  describe('createStorage (STORAGE_DRIVER)', () => {
    it('usa o driver local por padrão', () => {
      expect(createStorage({ JWT_SECRET: 'x' }).driver).toBe('local')
    })

    it('usa o s3 com bucket e região', () => {
      expect(createStorage({ STORAGE_DRIVER: 's3', S3_BUCKET: 'b', AWS_REGION: 'sa-east-1' }).driver).toBe('s3')
    })

    it('explica o que falta na configuração', () => {
      expect(() => createStorage({ STORAGE_DRIVER: 's3' })).toThrow('STORAGE_DRIVER=s3 exige S3_BUCKET e AWS_REGION.')
      expect(() => createStorage({})).toThrow('Defina JWT_SECRET')
      expect(() => createStorage({ STORAGE_DRIVER: 'ftp', JWT_SECRET: 'x' })).toThrow('STORAGE_DRIVER inválido')
    })
  })
})
