import { SetMetadata } from '@nestjs/common'

export const USER_ROLES = ['medico', 'gestor'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const ROLES_KEY = 'roles'
export const IS_PUBLIC_KEY = 'isPublic'

/** Restringe a rota a determinados perfis (ex.: @Roles('gestor')) */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

/** Libera a rota sem token (ex.: login) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

/** Dados do usuário logado, extraídos do token */
export interface AuthUser {
  id: string
  name: string
  role: UserRole
}
