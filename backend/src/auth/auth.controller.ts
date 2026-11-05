import { Body, Controller, Get, HttpCode, NotFoundException, Post } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { PatientLoginDto, PatientRegisterDto } from './patient-auth.dto.js'

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

  @Public()
  @Post('patient-login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login do paciente no app (CPF e senha, como no gov.br)',
    description: 'O token traz o CPF do paciente e só abre as rotas /me. A senha nunca aparece na resposta.',
  })
  @ApiOkResponse({ type: LoginResponse })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'CPF inválido ou senha vazia',
    example: { statusCode: 400, message: 'CPF inválido.' },
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponse,
    description: 'CPF sem conta ou senha errada (mesma mensagem nos dois casos)',
    example: { statusCode: 401, message: 'CPF ou senha inválidos.' },
  })
  patientLogin(@Body() body: PatientLoginDto) {
    return this.authService.patientLogin(body.cpf, body.password)
  }

  @Public()
  @Post('patient-register')
  @ApiOperation({
    summary: 'Primeiro acesso do paciente: cria a senha do app',
    description:
      'O paciente confirma quem é com CPF + data de nascimento, que precisam bater com o prontuário criado pelo médico ' +
      '(só quem já foi atendido tem cadastro). A senha tem de 8 a 64 caracteres, com letras e números, ' +
      'e não pode conter o CPF nem a data de nascimento. Já devolve o token (entra direto).',
  })
  @ApiCreatedResponse({ type: LoginResponse })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'CPF e data de nascimento não conferem, ou senha fraca',
    example: { statusCode: 400, message: 'A senha precisa ter letras e números.' },
  })
  @ApiConflictResponse({
    type: ErrorResponse,
    description: 'O CPF já tem conta',
    example: { statusCode: 409, message: 'Este CPF já tem conta. Use a opção Entrar.' },
  })
  registerPatient(@Body() body: PatientRegisterDto) {
    return this.authService.registerPatient(body)
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
