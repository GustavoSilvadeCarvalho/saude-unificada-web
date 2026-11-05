import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ThrottlerGuard, type ThrottlerModuleOptions } from '@nestjs/throttler'

// Limite de tentativas nas rotas de entrada (login do site, login do app e primeiro acesso),
// contra quem tenta adivinhar senha ou data de nascimento por força bruta:
//   - "conta": por IP + conta (e-mail ou CPF) → trava quem insiste numa conta só;
//   - "ip": por IP, mais folgado → trava quem testa várias contas (vazamento de senhas),
//     sem atrapalhar uma clínica inteira que sai pelo mesmo IP.
// Valores por minuto, configuráveis no ambiente; 0 desliga (usado no teste de carga da AWS).
// O contador fica na memória de cada instância: com 3 tarefas na AWS, o limite real triplica.
// Em produção de verdade, trocar por um armazenamento compartilhado (Redis).

export const LOGIN_THROTTLE_TTL_MS = 60_000

export const TOO_MANY_ATTEMPTS = 'Muitas tentativas de entrada. Aguarde 1 minuto e tente de novo.'

/** E-mail (site) ou CPF (app), normalizado como no DTO; o guard roda antes da validação */
function account(body: Record<string, unknown> | undefined): string {
  if (typeof body?.email === 'string') return body.email.trim().toLowerCase()
  if (typeof body?.cpf === 'string') return body.cpf.replace(/\D/g, '')
  return ''
}

export function loginThrottleOptions(config: ConfigService): ThrottlerModuleOptions {
  const perAccount = Number(config.get<string>('LOGIN_RATE_LIMIT', '5'))
  const perIp = Number(config.get<string>('LOGIN_RATE_LIMIT_IP', '30'))
  return {
    errorMessage: TOO_MANY_ATTEMPTS,
    throttlers: [
      {
        name: 'conta',
        ttl: LOGIN_THROTTLE_TTL_MS,
        limit: perAccount,
        skipIf: () => perAccount === 0,
        getTracker: (req) => `${req.ip}|${account(req.body)}`,
      },
      {
        name: 'ip',
        ttl: LOGIN_THROTTLE_TTL_MS,
        limit: perIp,
        skipIf: () => perIp === 0,
        getTracker: (req) => req.ip,
      },
    ],
  }
}

/** Aplicado só nas rotas de entrada, com @UseGuards(LoginThrottleGuard) */
@Injectable()
export class LoginThrottleGuard extends ThrottlerGuard {}
