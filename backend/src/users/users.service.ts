import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { isValidObjectId, type Model, type Types } from 'mongoose'
import { User, type UserDocument } from './user.schema.js'

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  /** Busca pelo e-mail incluindo o hash da senha (usado só no login) */
  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash').exec()
  }

  /** Conta de paciente pelo CPF, incluindo o hash da senha (usado só no login do app) */
  findPatientByCpfWithPassword(cpf: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ cpf, role: 'paciente' }).select('+passwordHash').exec()
  }

  async patientAccountExists(cpf: string): Promise<boolean> {
    return (await this.userModel.exists({ cpf, role: 'paciente' })) !== null
  }

  createPatientAccount(data: { name: string; cpf: string; passwordHash: string }): Promise<UserDocument> {
    return this.userModel.create({ ...data, role: 'paciente' })
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!isValidObjectId(id)) return null
    return this.userModel.findById(id).exec()
  }

  /** Especialidade de cada médico, por id (usado no resumo de atendimentos do prontuário) */
  async findSpecialties(ids: Types.ObjectId[]): Promise<Map<string, string | undefined>> {
    if (ids.length === 0) return new Map()
    const users = await this.userModel.find({ _id: { $in: ids } }, { specialty: 1 }).lean().exec()
    return new Map(users.map((u) => [String(u._id), u.specialty]))
  }
}
