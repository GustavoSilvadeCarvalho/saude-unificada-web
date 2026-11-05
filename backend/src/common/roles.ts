import { SetMetadata } from '@nestjs/common'

/** medico e gestor usam o site (login por e-mail); paciente usa o app (login por CPF, estilo gov.br) */
export const USER_ROLES = ['medico', 'gestor', 'paciente'] as const
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
  /** Só no perfil paciente: o CPF do próprio prontuário */
  cpf?: string
}
