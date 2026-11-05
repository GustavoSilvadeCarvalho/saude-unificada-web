import { completeCpf, CPF_EXAMPLE_MESSAGE, CPF_INVALID_MESSAGE, cpfProblem, EXAMPLE_CPFS, isValidCpf, normalizeCpf } from '../src/common/cpf.js'
import { SEED_CPFS } from '../src/database/seed-data.js'

// Testes unitários das regras de CPF (não sobem a API nem o banco)

describe('Regras de CPF', () => {
  describe('normalizeCpf (formato)', () => {
    it.each([
      ['22916926402', '22916926402'],
      ['229.169.264-02', '22916926402'],
      ['  229.169.264-02  ', '22916926402'],
    ])('aceita %j', (value, expected) => {
      expect(normalizeCpf(value)).toBe(expected)
    })

    it.each(['229169264', '229169264021', '229.16926402', '229-169-264.02', '229 169 264 02', '2291692640a', '', null, 22916926402])(
      'recusa %j',
      (value) => {
        expect(normalizeCpf(value)).toBeNull()
      },
    )
  })

  describe('cpfProblem (regras)', () => {
    it('aceita CPF com dígitos verificadores corretos', () => {
      expect(cpfProblem('22916926402')).toBeNull()
      expect(cpfProblem('229.169.264-02')).toBeNull()
    })

    it('recusa dígito verificador errado (primeiro e segundo)', () => {
      expect(cpfProblem('22916926412')).toBe(CPF_INVALID_MESSAGE)
      expect(cpfProblem('22916926403')).toBe(CPF_INVALID_MESSAGE)
    })

    it('recusa os 11 dígitos iguais, mesmo os que "passam" na conta (000.000.000-00, 111.111.111-11...)', () => {
      for (let d = 0; d <= 9; d++) expect(cpfProblem(String(d).repeat(11))).toBe(CPF_INVALID_MESSAGE)
    })

    it('recusa todos os CPFs de exemplo conhecidos, que têm dígitos válidos', () => {
      for (const cpf of EXAMPLE_CPFS) {
        expect(completeCpf(cpf.slice(0, 9)), `${cpf} deveria ter dígitos válidos`).toBe(cpf)
        expect(cpfProblem(cpf)).toBe(CPF_EXAMPLE_MESSAGE)
      }
    })

    it('recusa formato errado', () => {
      expect(cpfProblem('2291692640')).toBe(CPF_INVALID_MESSAGE)
      expect(cpfProblem(undefined)).toBe(CPF_INVALID_MESSAGE)
    })
  })

  it('todos os CPFs do seed passam nas regras', () => {
    for (const cpf of Object.values(SEED_CPFS)) expect(isValidCpf(cpf), cpf).toBe(true)
  })

  it('completeCpf calcula os dígitos verificadores', () => {
    expect(completeCpf('229169264')).toBe('22916926402')
  })
})
