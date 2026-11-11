import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { VERIFICATION_CODE_EXAMPLE } from '../common/verification.js'
import { APPOINTMENT_STATUSES, DOCUMENT_TYPES } from './appointment.constants.js'

// Classes usadas só para documentar as respostas no Swagger (formato do API_CONTRACT.md).

export class AttachedDocumentResponse {
  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80c01' })
  id: string

  @ApiProperty({ example: 'receita_amoxicilina.pdf' })
  fileName: string

  @ApiProperty({ enum: DOCUMENT_TYPES, example: 'receita' })
  type: string

  @ApiProperty({ example: '2026-10-01T14:41:00.000Z' })
  uploadedAt: string

  @ApiPropertyOptional({
    example: VERIFICATION_CODE_EXAMPLE,
    description: 'Código para conferir a autenticidade em GET /verify/{code} (ex.: na farmácia)',
  })
  verificationCode?: string

  @ApiPropertyOptional({
    example: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    description: 'SHA-256 do arquivo enviado',
  })
  sha256?: string
}

export class AppointmentResponse {
  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80b01' })
  id: string

  @ApiProperty({ example: '22916926402' })
  patientCpf: string

  @ApiProperty({ example: 'Maria Aparecida da Silva' })
  patientName: string

  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80912' })
  doctorId: string

  @ApiProperty({ example: 'Dr. Rafael Moreira Lima' })
  doctorName: string

  @ApiProperty({ example: '2026-10-01T14:30:00.000Z' })
  date: string

  @ApiProperty({ enum: APPOINTMENT_STATUSES, example: 'realizado' })
  status: string

  @ApiPropertyOptional({ example: 'Retorno — controle glicêmico' })
  reason?: string

  @ApiProperty({ example: 'Paciente estável, glicemia em melhora. Mantida conduta.' })
  summary: string

  @ApiPropertyOptional({
    example: 'Jejum de 8 horas. Trazer os exames de sangue e a lista de remédios em uso.',
    description: 'Orientações para o paciente antes do atendimento (aparece no app)',
  })
  instructions?: string

  @ApiProperty({ type: [AttachedDocumentResponse] })
  documents: AttachedDocumentResponse[]
}

/** Resultado da conferência pública de um documento (sem CPF nem nome completo do paciente) */
export class VerifiedDocumentResponse {
  @ApiProperty({ example: true })
  valid: boolean

  @ApiProperty({ example: VERIFICATION_CODE_EXAMPLE })
  verificationCode: string

  @ApiProperty({ enum: DOCUMENT_TYPES, example: 'receita' })
  type: string

  @ApiProperty({ example: 'receita_amoxicilina.pdf' })
  fileName: string

  @ApiProperty({ example: '2026-10-01T14:41:00.000Z', description: 'Quando o documento foi emitido' })
  issuedAt: string

  @ApiProperty({ example: 'Dr. Rafael Moreira Lima' })
  doctorName: string

  @ApiPropertyOptional({ example: 'CRM-SP 123456' })
  doctorCrm?: string

  @ApiProperty({ example: 'M. A. S.', description: 'Só as iniciais do paciente (LGPD)' })
  patientInitials: string

  @ApiProperty({
    example: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    description: 'Compare com o SHA-256 do arquivo recebido para ter certeza de que não foi alterado',
  })
  sha256: string
}

/** Link temporário de download (médico e paciente usam o mesmo formato) */
export class DownloadLinkResponse {
  @ApiProperty({
    example: 'https://saude-unificada-docs.s3.sa-east-1.amazonaws.com/appointments/...&X-Amz-Expires=300',
    description: 'Abrir direto no navegador ou no app (não precisa do token)',
  })
  url: string

  @ApiProperty({ example: '2026-10-01T14:46:00.000Z', description: 'O link vale 5 minutos' })
  expiresAt: string
}
