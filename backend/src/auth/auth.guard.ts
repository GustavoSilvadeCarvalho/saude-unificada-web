import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { type AuthUser, IS_PUBLIC_KEY, ROLES_KEY, type UserRole } from '../common/roles.js'

// Guard global: toda rota exige "Authorization: Bearer <token>", exceto as marcadas com @Public().
// Se a rota tiver @Roles(...), o perfil do token também precisa bater.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()]
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    const [scheme, token] = request.headers.authorization?.split(' ') ?? []
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Faça login para continuar.')

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; name: string; role: UserRole }>(token)
      request.user = { id: payload.sub, name: payload.name, role: payload.role }
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada. Faça login novamente.')
    }

    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, targets)
    if (roles && !roles.includes(request.user.role)) {
      throw new ForbiddenException('Seu perfil não tem permissão para acessar este recurso.')
    }
    return true
  }
}
