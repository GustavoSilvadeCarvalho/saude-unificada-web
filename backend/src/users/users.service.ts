import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { isValidObjectId, type Model } from 'mongoose'
import { User, type UserDocument } from './user.schema.js'

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  /** Busca pelo e-mail incluindo o hash da senha (usado só no login) */
  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash').exec()
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!isValidObjectId(id)) return null
    return this.userModel.findById(id).exec()
  }
}
