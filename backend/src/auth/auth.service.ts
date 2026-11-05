import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcryptjs'
import type { AuthUser } from '../common/roles.js'
import { UsersService } from '../users/users.service.js'

const INVALID_LOGIN = 'E-mail ou senha inválidos.'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email)
    // Mesma mensagem para e-mail inexistente e senha errada (não revela quais e-mails existem)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException(INVALID_LOGIN)
    }
    const payload: AuthUser = { id: user.id, name: user.name, role: user.role }
    const token = await this.jwtService.signAsync({ sub: payload.id, name: payload.name, role: payload.role })
    return { token, user }
  }
}
