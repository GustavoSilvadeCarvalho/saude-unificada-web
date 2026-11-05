import { Body, Controller, Get, HttpCode, NotFoundException, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/current-user.decorator.js'
import { type AuthUser, Public } from '../common/roles.js'
import { UsersService } from '../users/users.service.js'
import { AuthService } from './auth.service.js'
import { LoginDto } from './login.dto.js'

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login de profissional de saúde ou gestor' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password)
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dados do usuário logado' })
  async me(@CurrentUser() user: AuthUser) {
    const found = await this.usersService.findById(user.id)
    if (!found) throw new NotFoundException('Usuário não encontrado.')
    return found
  }
}
