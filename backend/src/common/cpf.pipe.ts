import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common'
import { isValidCpf, onlyDigits } from './cpf.js'

/**
 * Valida o CPF vindo da URL (ex.: GET /patients/:cpf) e devolve só os dígitos.
 * Aceita com ou sem máscara; responde 400 se os dígitos verificadores não baterem.
 */
@Injectable()
export class ParseCpfPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const cpf = onlyDigits(value ?? '')
    if (!isValidCpf(cpf)) throw new BadRequestException('CPF inválido.')
    return cpf
  }
}
