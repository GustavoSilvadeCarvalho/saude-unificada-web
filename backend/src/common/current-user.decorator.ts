import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { AuthUser } from './roles.js'

/** Injeta o usuário logado no handler: `@CurrentUser() user: AuthUser` */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user
})
