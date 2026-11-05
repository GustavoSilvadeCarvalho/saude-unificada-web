import { IsIn } from 'class-validator'
import { DOCUMENT_TYPES, type DocumentType } from './appointment.constants.js'

/** Campo de texto do formulário de upload (o arquivo vem no campo "file") */
export class UploadDocumentDto {
  @IsIn(DOCUMENT_TYPES, { message: 'Tipo de documento inválido. Use receita, laudo, exame ou outro.' })
  type: DocumentType
}
