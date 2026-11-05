import { Body, Controller, Get, HttpCode, NotFoundException, Post } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { CurrentUser } from '../common/current-user.decorator.js'
import { ErrorResponse } from '../common/error-response.js'
import { type AuthUser, Public } from '../common/roles.js'
import { UsersService } from '../users/users.service.js'
import { LoginResponse, UserResponse } from './auth.responses.js'
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
  @ApiOperation({
    summary: 'Login de profissional de saúde ou gestor',
    description: 'Devolve o token JWT e os dados do usuário. A senha nunca aparece na resposta.',
  })
  @ApiOkResponse({ type: LoginResponse })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'E-mail em formato inválido ou senha vazia',
    example: { statusCode: 400, message: 'Informe um e-mail válido.' },
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponse,
    description: 'E-mail ou senha inválidos',
    example: { statusCode: 401, message: 'E-mail ou senha inválidos.' },
  })
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password)
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dados do usuário logado' })
  @ApiOkResponse({ type: UserResponse })
  @ApiUnauthorizedResponse({
    type: ErrorResponse,
    description: 'Sem token, token inválido ou expirado',
    example: { statusCode: 401, message: 'Faça login para continuar.' },
  })
  async me(@CurrentUser() user: AuthUser) {
    const found = await this.usersService.findById(user.id)
    if (!found) throw new NotFoundException('Usuário não encontrado.')
    return found
  }
}
