import { Transform } from 'class-transformer'
import { normalizeCpf } from './cpf.js'

/** Trata "" (campo opcional deixado em branco no formulário) como ausente */
export const EmptyToUndefined = () =>
  Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))

/** Remove espaços extras de textos */
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))

/**
 * Tira a máscara do CPF ("229.169.264-02" → "22916926402") quando o formato é aceito.
 * Em formato estranho mantém o valor como veio, para o @IsCpf() recusar.
 */
export const NormalizeCpf = () => Transform(({ value }) => normalizeCpf(value) ?? value)
