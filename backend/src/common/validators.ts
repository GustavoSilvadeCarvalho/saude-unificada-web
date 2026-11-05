import { ValidateBy, type ValidationOptions } from 'class-validator'
import { isValidCpf } from './cpf.js'

/** CPF com dígitos verificadores válidos (use junto com @Digits() para aceitar máscara) */
export function IsCpf(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isCpf',
      validator: {
        validate: (value) => typeof value === 'string' && isValidCpf(value),
        defaultMessage: () => 'CPF inválido.',
      },
    },
    options,
  )
}

/** true se for uma data real no formato AAAA-MM-DD (rejeita 2026-02-30, por exemplo) */
export function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Hoje no formato AAAA-MM-DD (fuso de Brasília, onde a plataforma é usada) */
export function todayDateOnly(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

/**
 * Data no formato AAAA-MM-DD.
 * Com `notFuture: true`, rejeita datas depois de hoje (ex.: nascimento, diagnóstico).
 */
export function IsDateOnly(config: { notFuture?: boolean } = {}, options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isDateOnly',
      validator: {
        validate: (value) =>
          isDateOnly(value) && value >= '1900-01-01' && (!config.notFuture || value <= todayDateOnly()),
        defaultMessage: () => 'Data inválida. Use o formato AAAA-MM-DD.',
      },
    },
    options,
  )
}
