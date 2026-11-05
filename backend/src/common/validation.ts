import { BadRequestException } from '@nestjs/common'
import type { ValidationError } from 'class-validator'

/** Nome legível dos itens de cada lista, para mensagens como "Alergia 2: Informe a substância..." */
const LIST_ITEM_LABELS: Record<string, string> = {
  newAllergies: 'Alergia',
  newMedications: 'Medicamento',
  newConditions: 'Condição',
}

function collectMessages(errors: ValidationError[], prefix = ''): string[] {
  return errors.flatMap((error) => {
    const own = Object.values(error.constraints ?? {}).map((message) => `${prefix}${message}`)
    const children = (error.children ?? []).flatMap((child) => {
      const label = LIST_ITEM_LABELS[error.property]
      // Item de lista: a propriedade do filho é o índice ("0", "1"...)
      const childPrefix = label && /^\d+$/.test(child.property) ? `${prefix}${label} ${Number(child.property) + 1}: ` : prefix
      return collectMessages([child], childPrefix)
    })
    return [...own, ...children]
  })
}

/**
 * Erros de validação viram mensagens prontas para o usuário, sem o caminho técnico
 * do class-validator (ex.: "newAllergies.0.Gravidade..." vira "Alergia 1: Gravidade...").
 */
export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException(collectMessages(errors))
}
