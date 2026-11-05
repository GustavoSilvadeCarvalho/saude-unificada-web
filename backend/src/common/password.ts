// Regras da senha do paciente (app), no espírito do gov.br: fácil de lembrar, difícil de adivinhar.

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 64

/** Senhas que aparecem no topo das listas de senhas vazadas */
const COMMON_PASSWORDS = new Set([
  'senha123',
  'senha1234',
  'abc12345',
  'abcd1234',
  'password1',
  'qwerty123',
  '1234abcd',
  '12345678a',
  'a12345678',
  'brasil123',
  'mudar123',
])

/** Formas comuns de escrever a data de nascimento numa senha (AAAA-MM-DD → 14031958, 19580314, 140358) */
function birthDateForms(birthDate: string): string[] {
  const [year, month, day] = birthDate.split('-')
  return [`${day}${month}${year}`, `${year}${month}${day}`, `${day}${month}${year.slice(2)}`]
}

/**
 * Motivo pelo qual a senha não serve, ou null se estiver boa.
 * Recusa: menos de 8 ou mais de 64 caracteres, sem letra ou sem número, senha comum,
 * e senha que contém o CPF ou a data de nascimento (dados que estão em qualquer cadastro).
 */
export function passwordProblem(password: unknown, owner: { cpf: string; birthDate: string }): string | null {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`
  }
  if (password.length > PASSWORD_MAX) return `A senha pode ter no máximo ${PASSWORD_MAX} caracteres.`
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'A senha precisa ter letras e números.'
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'Essa senha é muito comum. Escolha outra.'

  const digits = password.replace(/\D/g, '')
  // Qualquer trecho de 6 dígitos seguidos do CPF já entrega boa parte do documento
  for (let i = 0; i + 6 <= owner.cpf.length; i++) {
    if (digits.includes(owner.cpf.slice(i, i + 6))) return 'A senha não pode conter o seu CPF.'
  }
  if (birthDateForms(owner.birthDate).some((form) => digits.includes(form))) {
    return 'A senha não pode conter a sua data de nascimento.'
  }
  return null
}
