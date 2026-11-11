import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SiteFooter } from '../components/layout/SiteFooter'
import { SiteHeader } from '../components/layout/SiteHeader'
import { Button } from '../components/ui/Button'
import { ApiError, verifyDocument } from '../services/api'
import type { DocumentType, VerifiedDocument } from '../types'
import { formatDateTime, formatVerificationCode } from '../utils/format'

const TIPO: Record<DocumentType, string> = {
  receita: 'Receita',
  laudo: 'Laudo',
  exame: 'Resultado de exame',
  outro: 'Documento',
}

type Estado =
  | { fase: 'vazio' }
  | { fase: 'buscando' }
  | { fase: 'ok'; doc: VerifiedDocument }
  | { fase: 'erro'; mensagem: string }

/** Página pública: a farmácia digita o código impresso e confere a receita ou o laudo */
export default function Verificar() {
  const { codigo: codigoUrl = '' } = useParams()
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState(codigoUrl)
  const [estado, setEstado] = useState<Estado>({ fase: 'vazio' })

  // O código na URL (/verificar/K7QM-3XRA-9DPE) já dispara a conferência
  useEffect(() => {
    setCodigo(codigoUrl)
    if (!codigoUrl) {
      setEstado({ fase: 'vazio' })
      return
    }
    let ativo = true
    setEstado({ fase: 'buscando' })
    verifyDocument(codigoUrl)
      .then((doc) => ativo && setEstado({ fase: 'ok', doc }))
      .catch((e: unknown) => {
        if (!ativo) return
        const mensagem =
          e instanceof ApiError && e.status === 404
            ? 'Não achamos nenhum documento com esse código. Confira se digitou igual ao que está impresso.'
            : e instanceof Error
              ? e.message
              : 'Não foi possível conferir agora.'
        setEstado({ fase: 'erro', mensagem })
      })
    return () => {
      ativo = false
    }
  }, [codigoUrl])

  function enviar(e: FormEvent) {
    e.preventDefault()
    const limpo = formatVerificationCode(codigo)
    if (limpo) navigate(`/verificar/${encodeURIComponent(limpo)}`)
  }

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="font-serif text-3xl font-bold text-slate-900 md:text-4xl">Conferir receita ou laudo</h1>
        <p className="mt-3 text-lg text-slate-700">
          Digite o código de 12 caracteres impresso no documento. Pode ser em minúsculas e sem os traços.
        </p>

        <form onSubmit={enviar} className="mt-8 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="codigo" className="sr-only">
            Código de verificação
          </label>
          <input
            id="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="K7QM-3XRA-9DPE"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 rounded-md border border-slate-400 bg-white px-3 py-3 font-mono text-lg uppercase tracking-wider text-slate-900 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none"
          />
          <Button type="submit" size="lg" loading={estado.fase === 'buscando'}>
            Conferir
          </Button>
        </form>

        <div className="mt-10" aria-live="polite">
          {estado.fase === 'ok' && <Resultado doc={estado.doc} />}
          {estado.fase === 'erro' && (
            <div className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-amber-900">
              <p className="font-semibold">Código não encontrado</p>
              <p className="mt-1">{estado.mensagem}</p>
            </div>
          )}
          {estado.fase === 'vazio' && (
            <p className="text-sm text-slate-500">
              Mostramos quem emitiu o documento e quando. Do paciente, só as iniciais. O CPF e o nome completo nunca aparecem aqui.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

function Resultado({ doc }: { doc: VerifiedDocument }) {
  const linhas: [string, string][] = [
    ['Tipo', TIPO[doc.type]],
    ['Emitido em', formatDateTime(doc.issuedAt)],
    ['Profissional', doc.doctorCrm ? `${doc.doctorName} (${/^CRM/i.test(doc.doctorCrm) ? '' : 'CRM '}${doc.doctorCrm})` : doc.doctorName],
    ['Paciente', doc.patientInitials],
    ['Arquivo', doc.fileName],
  ]
  return (
    <section aria-labelledby="resultado-title" className="rounded-lg border border-mint-600 bg-white">
      <div className="border-b border-mint-600/40 bg-mint-50 px-5 py-3">
        <h2 id="resultado-title" className="font-semibold text-mint-700">
          ✓ Documento autêntico, emitido pelo Saúde Unificada
        </h2>
        <p className="font-mono text-sm text-mint-700">{doc.verificationCode}</p>
      </div>
      <dl className="divide-y divide-slate-100 px-5">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="grid gap-1 py-2.5 sm:grid-cols-[9rem_1fr]">
            <dt className="text-slate-500">{rotulo}</dt>
            <dd className="text-slate-900">{valor}</dd>
          </div>
        ))}
        {doc.sha256 && (
          <div className="grid gap-1 py-2.5 sm:grid-cols-[9rem_1fr]">
            <dt className="text-slate-500">SHA-256</dt>
            <dd className="break-all font-mono text-xs text-slate-700">{doc.sha256}</dd>
          </div>
        )}
      </dl>
      <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
        Se tiver o PDF em mãos, o SHA-256 dele precisa ser igual a este. Se for diferente, o arquivo foi alterado depois de emitido.
      </p>
    </section>
  )
}
