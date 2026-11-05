import { passwordProblem } from '../src/common/password.js'

const owner = { cpf: '50717927296', birthDate: '1996-11-05' }

describe('Regras da senha do paciente', () => {
  it.each(['meuApp2026', 'Saude#Unificada7', 'ônibus azul 42', 'paciente123'])('aceita %j', (password) => {
    expect(passwordProblem(password, owner)).toBeNull()
  })

  it.each([
    ['abc123', 'A senha precisa ter pelo menos 8 caracteres.'],
    ['a1'.repeat(33), 'A senha pode ter no máximo 64 caracteres.'],
    ['somenteletras', 'A senha precisa ter letras e números.'],
    ['1234567890', 'A senha precisa ter letras e números.'],
    ['Senha123', 'Essa senha é muito comum. Escolha outra.'],
    ['abc50717927296', 'A senha não pode conter o seu CPF.'],
    ['x179272x', 'A senha não pode conter o seu CPF.'], // trecho de 6 dígitos do CPF
    ['maria05111996', 'A senha não pode conter a sua data de nascimento.'],
    ['nasci19961105', 'A senha não pode conter a sua data de nascimento.'],
    ['ana051196xy', 'A senha não pode conter a sua data de nascimento.'],
  ])('recusa %j', (password, message) => {
    expect(passwordProblem(password, owner)).toBe(message)
  })

  it('recusa valor que não é texto', () => {
    expect(passwordProblem(12345678, owner)).toBe('A senha precisa ter pelo menos 8 caracteres.')
  })
})
