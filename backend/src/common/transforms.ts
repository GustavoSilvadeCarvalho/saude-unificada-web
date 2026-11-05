import { Transform } from 'class-transformer'

/** Trata "" (campo opcional deixado em branco no formulário) como ausente */
export const EmptyToUndefined = () =>
  Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))

/** Remove espaços extras de textos */
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))

/** Mantém só os dígitos (CPF pode chegar com máscara) */
export const Digits = () => Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
