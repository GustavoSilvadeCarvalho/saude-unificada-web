import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Response } from 'express'

// Toda resposta de erro segue o contrato: { "message": "texto legível" }.
// O front exibe essa mensagem diretamente ao usuário.

const DEFAULT_MESSAGES: Partial<Record<number, string>> = {
  [HttpStatus.UNAUTHORIZED]: 'Sessão inválida ou expirada. Faça login novamente.',
  [HttpStatus.FORBIDDEN]: 'Seu perfil não tem permissão para acessar este recurso.',
  [HttpStatus.NOT_FOUND]: 'Recurso não encontrado.',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Arquivo muito grande. O limite é de 10 MB.',
}

const NEST_DEFAULT_MESSAGES = new Set([
  'Unauthorized',
  'Forbidden',
  'Forbidden resource',
  'Not Found',
  'File too large',
  'Payload Too Large',
])

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Erro')

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const { status, message } = this.describe(exception)
    if (status >= 500) this.logger.error(exception)
    response.status(status).json({ statusCode: status, message })
  }

  private describe(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()
      const raw = typeof body === 'string' ? body : (body as { message?: string | string[] }).message
      const custom = Array.isArray(raw) ? raw.join(' ') : raw
      // Mensagens padrão do Nest/Multer vêm em inglês; nesses casos usamos as nossas
      const useDefault = !custom || NEST_DEFAULT_MESSAGES.has(custom)
      return { status, message: useDefault ? (DEFAULT_MESSAGES[status] ?? custom ?? 'Erro na requisição.') : custom }
    }
    // Índice único violado (ex.: CPF ou e-mail repetido)
    if ((exception as { code?: number })?.code === 11000) {
      return { status: HttpStatus.CONFLICT, message: 'Registro já existente.' }
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Erro interno do servidor. Tente novamente.' }
  }
}
