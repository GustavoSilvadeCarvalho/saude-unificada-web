import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectConnection } from '@nestjs/mongoose'
import type { ClientSession, Connection } from 'mongoose'

/**
 * Roda várias gravações como uma operação só: ou tudo é salvo, ou nada é.
 * Usado no registro de atendimento (atendimento + prontuário + auditoria).
 *
 * Transação exige replica set (o Atlas, o dev:memory e o docker-compose já são).
 * MONGODB_TRANSACTIONS=false desliga a transação para bancos sem replica set;
 * nunca usar em produção.
 */
@Injectable()
export class TransactionRunner {
  private readonly logger = new Logger(TransactionRunner.name)
  private readonly enabled: boolean

  constructor(
    @InjectConnection() private readonly connection: Connection,
    config: ConfigService,
  ) {
    this.enabled = config.get<string>('MONGODB_TRANSACTIONS', 'true') !== 'false'
    if (!this.enabled) this.logger.warn('Transações desligadas (MONGODB_TRANSACTIONS=false). Não use em produção.')
  }

  /** Executa `work` numa transação; a sessão deve ser repassada a todas as leituras e gravações */
  run<T>(work: (session: ClientSession | null) => Promise<T>): Promise<T> {
    if (!this.enabled) return work(null)
    // connection.transaction repete a operação em caso de conflito transitório
    return this.connection.transaction((session) => work(session))
  }
}
