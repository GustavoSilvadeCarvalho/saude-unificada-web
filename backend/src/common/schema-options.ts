import type { SchemaOptions } from '@nestjs/mongoose'

// Converte os documentos do MongoDB para o formato do contrato:
// "_id" vira "id" (string) e campos internos não saem na resposta.
// storageKey: onde o arquivo está guardado (S3 ou disco); só a API usa.
const HIDDEN_FIELDS = ['_id', '__v', 'passwordHash', 'storageKey']

export function toJsonTransform(_doc: unknown, ret: Record<string, unknown>) {
  if (ret._id !== undefined) ret.id = String(ret._id)
  for (const field of HIDDEN_FIELDS) delete ret[field]
  return ret
}

/** Opções padrão para schemas e subdocumentos */
export const jsonSchemaOptions: SchemaOptions = {
  versionKey: false,
  toJSON: { transform: toJsonTransform },
}
