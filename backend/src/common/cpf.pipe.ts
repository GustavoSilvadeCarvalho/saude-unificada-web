import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common'
import { cpfProblem, normalizeCpf } from './cpf.js'

/**
 * Valida o CPF vindo da URL (ex.: GET /patients/:cpf) e devolve só os dígitos.
 * Aceita "22916926402" ou "229.169.264-02"; qualquer problema vira 400 com o motivo.
 */
@Injectable()
export class ParseCpfPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const problem = cpfProblem(value)
    if (problem) throw new BadRequestException(problem)
    return normalizeCpf(value) as string
  }
}
