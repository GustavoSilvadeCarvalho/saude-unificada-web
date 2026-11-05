import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { REGIONS } from '../common/regions.js'
import { ALLERGY_SEVERITIES, BLOOD_TYPES, CONDITION_STATUSES, SEXES } from './patient.constants.js'

// Classes usadas só para documentar as respostas no Swagger (formato do API_CONTRACT.md).

export class AllergyResponse {
  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80a01' })
  id: string

  @ApiProperty({ example: 'Penicilina' })
  substance: string

  @ApiProperty({ enum: ALLERGY_SEVERITIES, example: 'grave' })
  severity: string

  @ApiPropertyOptional({ example: 'Anafilaxia' })
  reaction?: string

  @ApiProperty({ example: '2015-06-02', description: 'AAAA-MM-DD' })
  recordedAt: string
}

export class MedicationResponse {
  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80a02' })
  id: string

  @ApiProperty({ example: 'Losartana potássica' })
  name: string

  @ApiProperty({ example: '50 mg' })
  dosage: string

  @ApiProperty({ example: '1x ao dia' })
  frequency: string

  @ApiProperty({ example: '2018-04-10', description: 'AAAA-MM-DD' })
  startDate: string

  @ApiPropertyOptional({ example: 'Dr. Rafael Moreira Lima' })
  prescribedBy?: string
}

export class ProcedureResponse {
  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80a03' })
  id: string

  @ApiProperty({ example: 'Colecistectomia videolaparoscópica' })
  name: string

  @ApiProperty({ example: '2016-09-12', description: 'AAAA-MM-DD' })
  date: string

  @ApiPropertyOptional({ example: 'Hospital das Clínicas - SP' })
  location?: string

  @ApiPropertyOptional({ example: 'Sem intercorrências' })
  notes?: string
}

export class ExamResponse {
  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80a04' })
  id: string

  @ApiProperty({ example: 'Hemoglobina glicada (HbA1c)' })
  name: string

  @ApiProperty({ example: '2026-07-18', description: 'AAAA-MM-DD' })
  date: string

  @ApiProperty({ example: '7,1% — acima da meta' })
  result: string

  @ApiPropertyOptional({ example: 'hba1c_jul2026.pdf' })
  fileName?: string

  @ApiPropertyOptional({
    example: '6729f1c2a3b4c5d6e7f80b01',
    description: 'Atendimento onde o arquivo foi anexado (para baixar pelo GET .../documents/:documentId/download)',
  })
  appointmentId?: string

  @ApiPropertyOptional({ example: '6729f1c2a3b4c5d6e7f80c01' })
  documentId?: string
}

export class ClinicalConditionResponse {
  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80a05' })
  id: string

  @ApiProperty({ example: 'Hipertensão arterial sistêmica' })
  name: string

  @ApiPropertyOptional({ example: 'I10', description: 'Código CID-10' })
  cid?: string

  @ApiProperty({ example: '2018-04-10', description: 'AAAA-MM-DD' })
  diagnosedAt: string

  @ApiProperty({ enum: CONDITION_STATUSES, example: 'controlada' })
  status: string
}

export class AppointmentSummaryResponse {
  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80b01' })
  appointmentId: string

  @ApiProperty({ example: '2026-08-02T12:00:00.000Z' })
  date: string

  @ApiProperty({ example: 'Dr. Rafael Moreira Lima' })
  doctorName: string

  @ApiPropertyOptional({ example: 'Clínica Médica' })
  specialty?: string

  @ApiProperty({ example: 'PA 132/84 mmHg. Mantida conduta.' })
  summary: string
}

export class PatientResponse {
  @ApiProperty({ example: '22916926402', description: 'Só dígitos' })
  cpf: string

  @ApiProperty({ example: 'Maria Aparecida da Silva' })
  fullName: string

  @ApiProperty({ example: '1958-03-14', description: 'AAAA-MM-DD' })
  birthDate: string

  @ApiProperty({ enum: SEXES, example: 'F' })
  sex: string

  @ApiProperty({ enum: BLOOD_TYPES, example: 'O-' })
  bloodType: string

  @ApiPropertyOptional({ example: '(11) 98765-4321' })
  phone?: string

  @ApiPropertyOptional({ example: 'maria.silva@email.com' })
  email?: string

  @ApiProperty({ enum: REGIONS, example: 'Grande São Paulo' })
  region: string

  @ApiProperty({ type: [AllergyResponse] })
  allergies: AllergyResponse[]

  @ApiProperty({ type: [MedicationResponse] })
  activeMedications: MedicationResponse[]

  @ApiProperty({ type: [ProcedureResponse] })
  procedures: ProcedureResponse[]

  @ApiProperty({ type: [ExamResponse] })
  exams: ExamResponse[]

  @ApiProperty({ type: [ClinicalConditionResponse] })
  clinicalConditions: ClinicalConditionResponse[]

  @ApiProperty({
    type: [AppointmentSummaryResponse],
    description: 'Só atendimentos realizados, do mais recente para o mais antigo',
  })
  appointmentSummaries: AppointmentSummaryResponse[]
}
