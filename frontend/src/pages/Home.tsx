import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SiteFooter } from '../components/layout/SiteFooter'
import { SiteHeader } from '../components/layout/SiteHeader'
import { ButtonLink, buttonClasses } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { APP_DOWNLOAD_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from '../config'
import { formatVerificationCode } from '../utils/format'

/* ---------- Conteúdo ---------- */

// O que o sistema faz de fato (nada de número inventado: só o que dá para testar)
const PONTOS = [
  {
    titulo: 'Um prontuário por CPF.',
    texto: 'Consultas, receitas, exames e alergias ficam no mesmo lugar, não importa em qual unidade o paciente foi atendido.',
  },
  {
    titulo: 'Alergia grave aparece primeiro.',
    texto: 'Antes do nome do remédio, antes do histórico: o médico vê em vermelho o que pode matar o paciente.',
  },
  {
    titulo: 'O paciente escolhe quem vê.',
    texto: 'Pelo app ele bloqueia um médico específico. E toda abertura do prontuário fica registrada, com nome e horário.',
  },
  {
    titulo: 'Receita com código de conferência.',
    texto: 'Cada receita ou laudo anexado ganha um código. A farmácia digita o código aqui no site e confere se é verdadeiro.',
  },
]

// Um atendimento contado do começo ao fim, com dados de teste
const PASSOS = [
  {
    quem: 'Médico',
    titulo: 'Digita o CPF da Maria',
    texto: 'O prontuário abre com o tipo sanguíneo (O−) e a alergia grave a penicilina no topo, antes de qualquer outra coisa.',
  },
  {
    quem: 'Médico',
    titulo: 'Registra a consulta',
    texto: 'Escreve o diagnóstico e a conduta, e anexa a receita em PDF. O sistema calcula a impressão digital (SHA-256) do arquivo.',
  },
  {
    quem: 'Sistema',
    titulo: 'A receita ganha um código',
    texto: 'Algo como K7QM-3XRA-9DPE, impresso no documento. Doze caracteres, sem letras que se confundem com números.',
  },
  {
    quem: 'Farmácia',
    titulo: 'Confere a receita',
    texto: 'Digita o código na página de conferência e vê quem emitiu e quando. Da Maria, aparecem só as iniciais.',
  },
  {
    quem: 'Paciente',
    titulo: 'Maria vê tudo no celular',
    texto: 'No app, ela abre a receita, vê o próximo retorno e a lista de quem acessou o prontuário dela.',
  },
]

const PUBLICOS = [
  {
    titulo: 'Profissional de saúde',
    onde: 'no site',
    texto: 'Busca o paciente pelo CPF, cadastra quem ainda não tem prontuário, registra atendimentos e anexa receitas e laudos.',
    link: { label: 'Entrar', to: '/login' },
  },
  {
    titulo: 'Gestor da região',
    onde: 'no site',
    texto: 'Vê quantos atendimentos houve, as doenças mais comuns e a evolução mês a mês. Só números agregados, sem nome de ninguém.',
    link: { label: 'Entrar', to: '/login' },
  },
  {
    titulo: 'Paciente',
    onde: 'no aplicativo',
    texto: 'Entra com o CPF, vê receitas, exames e consultas marcadas, e decide quais médicos podem abrir o prontuário.',
    link: { label: 'Baixar o app', href: APP_DOWNLOAD_URL },
  },
]

const FAQ = [
  { q: 'Quem pode abrir o meu prontuário?', a: 'Profissionais de saúde cadastrados, durante o atendimento. Cada acesso fica registrado e você vê a lista no app. Se quiser, bloqueia um médico específico. Gestores só veem totais por região, sem nomes.' },
  { q: 'Paciente usa o site?', a: 'Não. O site é para profissionais e gestores. O paciente usa o aplicativo, entrando com o CPF.' },
  { q: 'Como a farmácia sabe que a receita não foi falsificada?', a: 'Pelo código impresso na receita. Na página "Conferir receita", ela digita o código e o sistema mostra quem emitiu, quando e a impressão digital do arquivo. Se o PDF tiver sido alterado, a impressão digital não bate.' },
  { q: 'Achei um dado errado no meu histórico. E agora?', a: 'Avise o profissional no próximo atendimento ou fale com o suporte. Só profissional de saúde altera o prontuário, e a correção fica registrada.' },
  { q: 'Os dados que aparecem aqui são de verdade?', a: 'Não. Este é um Projeto Integrador e todos os pacientes, médicos e atendimentos são inventados. Os CPFs só têm o formato válido.' },
]

/* ---------- Componentes ---------- */

/** Prévia da tela de prontuário, com dados de teste */
function ProntuarioPreview() {
  return (
    <figure>
      <div className="rounded-lg border border-slate-300 bg-white shadow-[6px_6px_0_0_rgba(31,93,87,0.12)]" aria-hidden="true">
        <div className="flex items-center gap-1.5 border-b border-slate-200 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-3 truncate font-mono text-[11px] text-slate-400">/medico/paciente/123.456.789-09</span>
        </div>
        <div className="p-5">
          <div className="mb-4 flex items-start gap-3">
            <div>
              <p className="font-semibold text-slate-900">Maria Aparecida da Silva</p>
              <p className="text-sm text-slate-500">68 anos · última consulta há 12 dias</p>
            </div>
            <span className="ml-auto rounded bg-red-700 px-2 py-0.5 font-mono text-sm font-bold text-white">O−</span>
          </div>
          <div className="mb-4 border-l-4 border-red-700 bg-red-50 px-3 py-2">
            <p className="text-xs font-bold tracking-wide text-red-800">ALERGIAS</p>
            <p className="text-sm text-red-900">
              <strong>Penicilina — grave</strong> · Dipirona — moderada
            </p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <th className="w-32 py-1.5 text-left font-normal text-slate-500">Uso contínuo</th>
                <td className="py-1.5 text-slate-800">Losartana 50 mg, Metformina 850 mg</td>
              </tr>
              <tr>
                <th className="py-1.5 text-left font-normal text-slate-500">Condições</th>
                <td className="py-1.5 text-slate-800">Hipertensão, diabetes tipo 2</td>
              </tr>
              <tr>
                <th className="py-1.5 text-left font-normal text-slate-500">Último exame</th>
                <td className="py-1.5 text-slate-800">Hemoglobina glicada: 7,1%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-slate-500">Tela do prontuário, com uma paciente de teste.</figcaption>
    </figure>
  )
}

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const panelId = `faq-panel-${index}`
  return (
    <div className="border-b border-slate-300">
      <h3>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 py-4 text-left text-lg font-semibold text-slate-900 hover:text-brand-700"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {q}
          <Icon name="chevronDown" className={`h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="max-w-2xl pb-5 text-slate-700">
        {a}
      </div>
    </div>
  )
}

/** Campo para a farmácia conferir uma receita sem sair da página inicial */
function ConferirReceita() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  function enviar(e: FormEvent) {
    e.preventDefault()
    const limpo = formatVerificationCode(codigo)
    navigate(limpo ? `/verificar/${encodeURIComponent(limpo)}` : '/verificar')
  }
  return (
    <form onSubmit={enviar} className="mt-8 flex max-w-md flex-col gap-2 sm:flex-row">
      <label htmlFor="codigo-home" className="sr-only">
        Código impresso na receita
      </label>
      <input
        id="codigo-home"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="K7QM-3XRA-9DPE"
        autoComplete="off"
        spellCheck={false}
        className="flex-1 rounded-md border border-slate-400 bg-white px-3 py-2.5 font-mono uppercase tracking-wider text-slate-900 placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-brand-700 focus:outline-none"
      />
      <button type="submit" className={buttonClasses('primary', 'md')}>
        Conferir
      </button>
    </form>
  )
}

/* ---------- Página ---------- */

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        {/* Abertura */}
        <section aria-labelledby="hero-title" className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 md:grid-cols-[1.1fr_1fr] md:pb-20 md:pt-16">
            <div>
              <p className="text-sm text-slate-500">Projeto Integrador · 6º semestre de DSM</p>
              <h1 id="hero-title" className="mt-4 font-serif text-4xl font-bold leading-[1.1] text-slate-900 md:text-[3.25rem]">
                A alergia da dona Maria não pode depender da memória dela.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-700">
                Quando o paciente troca de UBS, de hospital ou de cidade, o histórico fica para trás. O Saúde Unificada junta consultas,
                receitas, exames e alergias num prontuário só, que o médico abre pelo CPF.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <ButtonLink to="/login" size="lg">
                  Entrar como profissional
                </ButtonLink>
                <a href={APP_DOWNLOAD_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline decoration-2 underline-offset-4 hover:text-brand-900">
                  Sou paciente, quero o app
                </a>
              </div>
            </div>
            <ProntuarioPreview />
          </div>
        </section>

        {/* O problema */}
        <section id="problema" aria-labelledby="problema-title" className="scroll-mt-20 py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 id="problema-title" className="font-serif text-3xl font-bold text-slate-900">
                Cada lugar guarda um pedaço da história
              </h2>
            </div>
            <div className="space-y-4 text-lg leading-relaxed text-slate-700">
              <p>
                A UBS tem a receita. O hospital tem o exame. A UPA tem o atendimento daquele domingo. Quem junta tudo, na prática, é o próprio
                paciente, quando lembra, e quando consegue explicar.
              </p>
              <p>
                O resultado é exame repetido, remédio receitado em dobro e, no pior caso, antibiótico para quem tem alergia a ele. Foi isso que a
                gente quis resolver.
              </p>
              <dl className="!mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
                {PONTOS.map((p) => (
                  <div key={p.titulo} className="border-t-2 border-slate-900 pt-3">
                    <dt className="font-semibold text-slate-900">{p.titulo}</dt>
                    <dd className="mt-1 text-base text-slate-600">{p.texto}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" aria-labelledby="como-title" className="scroll-mt-20 border-y border-slate-200 bg-white py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1fr_1.4fr]">
            <div className="md:sticky md:top-24 md:self-start">
              <h2 id="como-title" className="font-serif text-3xl font-bold text-slate-900">
                Uma consulta, do começo ao fim
              </h2>
              <p className="mt-4 text-slate-600">
                A Maria é uma das pacientes de teste. Dá para refazer esse caminho inteiro entrando com{' '}
                <span className="font-mono text-sm">medico@teste.com</span>.
              </p>
            </div>
            <ol className="relative border-l border-slate-300 pl-8">
              {PASSOS.map((p, i) => (
                <li key={p.titulo} className="relative pb-10 last:pb-0">
                  <span className="absolute -left-[45px] top-0 flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-paper font-serif text-sm font-bold text-slate-700">
                    {i + 1}
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-clay-600">{p.quem}</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">{p.titulo}</h3>
                  <p className="mt-1 text-slate-700">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Conferir receita */}
        <section id="conferir" aria-labelledby="conferir-title" className="scroll-mt-20 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="rounded-lg border-2 border-dashed border-slate-400 bg-white px-6 py-8 md:px-10">
              <h2 id="conferir-title" className="font-serif text-2xl font-bold text-slate-900">
                Trabalha em farmácia? Confira uma receita.
              </h2>
              <p className="mt-2 max-w-2xl text-slate-700">
                Digite o código que vem impresso no rodapé da receita ou do laudo. Não precisa de login. Pode digitar em minúsculas e sem os
                traços.
              </p>
              <ConferirReceita />
            </div>
          </div>
        </section>

        {/* Quem usa */}
        <section id="para-quem" aria-labelledby="para-quem-title" className="scroll-mt-20 pb-16 md:pb-24">
          <div className="mx-auto max-w-6xl px-4">
            <h2 id="para-quem-title" className="font-serif text-3xl font-bold text-slate-900">
              Quem usa o quê
            </h2>
            <ul className="mt-8 grid gap-8 md:grid-cols-3">
              {PUBLICOS.map((p) => (
                <li key={p.titulo} className="flex flex-col border-t-2 border-slate-900 pt-4">
                  <h3 className="text-xl font-semibold text-slate-900">
                    {p.titulo} <span className="font-normal text-slate-500">— {p.onde}</span>
                  </h3>
                  <p className="mt-2 flex-1 text-slate-700">{p.texto}</p>
                  {p.link.to ? (
                    <Link to={p.link.to} className="mt-4 font-semibold text-brand-700 hover:text-brand-900">
                      {p.link.label} →
                    </Link>
                  ) : (
                    <a href={p.link.href} target="_blank" rel="noreferrer" className="mt-4 font-semibold text-brand-700 hover:text-brand-900">
                      {p.link.label} →
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Dúvidas */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t border-slate-200 bg-white py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1fr_1.4fr]">
            <h2 id="faq-title" className="font-serif text-3xl font-bold text-slate-900">
              Dúvidas comuns
            </h2>
            <div className="border-t border-slate-300">
              {FAQ.map((item, i) => (
                <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Suporte */}
        <section id="suporte" aria-labelledby="suporte-title" className="scroll-mt-20 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 id="suporte-title" className="font-serif text-2xl font-bold text-slate-900">
              Precisa falar com alguém?
            </h2>
            <p className="mt-3 max-w-3xl text-slate-700">
              Ligue no{' '}
              <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`} className="font-semibold text-brand-700 underline underline-offset-2">
                {SUPPORT_PHONE}
              </a>{' '}
              ou escreva para{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all font-semibold text-brand-700 underline underline-offset-2">
                {SUPPORT_EMAIL}
              </a>
              , de segunda a sexta, das 8h às 18h. Para as dúvidas mais comuns tem o chat no canto da tela, que responde na hora.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
