import { Controller, Get, HttpStatus, Res } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { ApiOkResponse, ApiOperation, ApiProperty, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import type { Connection } from 'mongoose'
import { Public } from '../common/roles.js'

class HealthResponse {
  @ApiProperty({ enum: ['ok', 'erro'], example: 'ok' })
  status: 'ok' | 'erro'

  @ApiProperty({ enum: ['up', 'down'], example: 'up', description: 'Conexão com o MongoDB' })
  mongodb: 'up' | 'down'

  @ApiProperty({ example: 3600, description: 'Segundos desde que a API subiu' })
  uptimeSeconds: number

  @ApiProperty({ example: '2026-11-05T03:00:00.000Z' })
  timestamp: string
}

class LiveResponse {
  @ApiProperty({ example: 'ok' })
  status: 'ok'
}

const PING_TIMEOUT_MS = 2000

// Rotas públicas de saúde, usadas pelo load balancer (AWS) e pelo monitoramento.
@ApiTags('Saúde')
@Public()
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({
    summary: 'Status da API e do MongoDB',
    description: 'Responde 200 com tudo funcionando e 503 se o MongoDB estiver fora. Usado pelos alarmes do CloudWatch.',
  })
  @ApiOkResponse({ type: HealthResponse })
  @ApiServiceUnavailableResponse({ type: HealthResponse, description: 'MongoDB fora do ar' })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const mongodb = (await this.pingMongo()) ? 'up' : 'down'
    const status = mongodb === 'up' ? 'ok' : 'erro'
    res.status(status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
    return {
      status,
      mongodb,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    }
  }

  @Get('live')
  @ApiOperation({
    summary: 'A API está de pé (não consulta o banco)',
    description:
      'Usado pelo health check do load balancer: uma queda rápida do MongoDB não deve fazer a AWS derrubar e recriar as instâncias da API.',
  })
  @ApiOkResponse({ type: LiveResponse })
  live(): LiveResponse {
    return { status: 'ok' }
  }

  /** true se o MongoDB responder ao ping dentro do tempo limite */
  private async pingMongo(): Promise<boolean> {
    if (this.connection.readyState !== 1 || !this.connection.db) return false
    const timeout = new Promise<false>((resolve) => setTimeout(() => resolve(false), PING_TIMEOUT_MS).unref())
    const ping = this.connection.db
      .admin()
      .ping()
      .then(() => true)
      .catch(() => false)
    return Promise.race([ping, timeout])
  }
}
