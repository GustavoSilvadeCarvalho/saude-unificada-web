import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import bcrypt from 'bcryptjs'
import type { Model } from 'mongoose'
import { passwordProblem } from '../common/password.js'
import type { AuthUser } from '../common/roles.js'
import { Patient } from '../patients/patient.schema.js'
import type { UserDocument } from '../users/user.schema.js'
import { UsersService } from '../users/users.service.js'
import type { PatientRegisterDto } from './patient-auth.dto.js'

const INVALID_LOGIN = 'E-mail ou senha inválidos.'
const INVALID_PATIENT_LOGIN = 'CPF ou senha inválidos.'
const IDENTITY_NOT_CONFIRMED =
  'Não encontramos um cadastro com esse CPF e essa data de nascimento. ' +
  'O cadastro é feito na unidade de saúde, no seu primeiro atendimento.'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectModel(Patient.name) private readonly patientModel: Model<Patient>,
  ) {}

  /** Médico e gestor (site): e-mail e senha */
  async login(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email)
    // Mesma mensagem para e-mail inexistente e senha errada (não revela quais e-mails existem)
    if (!user || user.role === 'paciente' || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException(INVALID_LOGIN)
    }
    return this.session(user)
  }

  /** Paciente (app): CPF e senha, como no gov.br */
  async patientLogin(cpf: string, password: string) {
    const user = await this.usersService.findPatientByCpfWithPassword(cpf)
    // Mesma mensagem para CPF sem conta e senha errada (não revela quem tem conta)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException(INVALID_PATIENT_LOGIN)
    }
    return this.session(user)
  }

  /**
   * Primeiro acesso do paciente: CPF + data de nascimento precisam bater com o prontuário
   * (o cadastro é feito pelo médico no atendimento). Depois disso, cria a conta e já entra.
   */
  async registerPatient({ cpf, birthDate, password }: PatientRegisterDto) {
    const patient = await this.patientModel.findOne({ cpf }, { fullName: 1, birthDate: 1 }).lean().exec()
    // Mesma mensagem para CPF sem prontuário e data errada (não revela quem é paciente)
    if (!patient || patient.birthDate !== birthDate) throw new BadRequestException(IDENTITY_NOT_CONFIRMED)

    if (await this.usersService.patientAccountExists(cpf)) {
      throw new ConflictException('Este CPF já tem conta. Use a opção Entrar.')
    }
    const problem = passwordProblem(password, { cpf, birthDate })
    if (problem) throw new BadRequestException(problem)

    const passwordHash = await bcrypt.hash(password, 10)
    try {
      const user = await this.usersService.createPatientAccount({ name: patient.fullName, cpf, passwordHash })
      return this.session(user)
    } catch (error) {
      // Dois primeiros acessos ao mesmo tempo: o índice único do CPF barra o segundo
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('Este CPF já tem conta. Use a opção Entrar.')
      }
      throw error
    }
  }

  /** Token + usuário (sem a senha). No paciente, o token leva o CPF do próprio prontuário */
  private async session(user: UserDocument) {
    const payload: AuthUser = { id: user.id, name: user.name, role: user.role, cpf: user.cpf }
    const token = await this.jwtService.signAsync({
      sub: payload.id,
      name: payload.name,
      role: payload.role,
      ...(payload.role === 'paciente' ? { cpf: payload.cpf } : {}),
    })
    return { token, user }
  }
}
