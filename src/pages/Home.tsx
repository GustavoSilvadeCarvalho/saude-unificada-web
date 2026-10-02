import { useState } from 'react'
import { SiteFooter } from '../components/layout/SiteFooter'
import { SiteHeader } from '../components/layout/SiteHeader'
import { ButtonLink, buttonClasses } from '../components/ui/Button'
import { Icon, type IconName } from '../components/ui/Icon'
import { APP_DOWNLOAD_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from '../config'

/* ---------- Conteúdo estático da página ---------- */

const VALUE_PROPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'clipboard', title: 'Prontuário único', text: 'Alergias, medicamentos, exames e procedimentos reunidos em um só histórico, independente de onde o paciente foi atendido.' },
  { icon: 'search', title: 'Acesso pelo CPF', text: 'O profissional encontra o histórico completo do paciente em segundos, só com o número do CPF.' },
  { icon: 'alert', title: 'Mais segurança clínica', text: 'Alergias graves e tipo sanguíneo aparecem em destaque, reduzindo riscos de erros em prescrições.' },
  { icon: 'chart', title: 'Dados para gestão', text: 'Gestores públicos acompanham indicadores por região para planejar campanhas e recursos.' },
]

const STATS = [
  { value: '12 mil+', label: 'prontuários no piloto' },
  { value: '6', label: 'regiões de saúde de SP' },
  { value: '-38%', label: 'exames repetidos' },
  { value: '4,8/5', label: 'satisfação dos usuários' },
]

const TESTIMONIALS = [
  { quote: 'Antes eu dependia do paciente lembrar o nome do remédio. Agora vejo tudo antes mesmo dele sentar.', name: 'Dra. Fernanda A.', role: 'Clínica geral — UBS' },
  { quote: 'Minha mãe tem alergia grave a penicilina e isso aparece logo de cara para qualquer médico. É um alívio.', name: 'Ricardo M.', role: 'Filho de paciente' },
  { quote: 'Conseguimos antecipar a campanha de dengue vendo a curva de atendimentos por região.', name: 'Marcos T.', role: 'Gestor regional de saúde' },
]

const STEPS = [
  { title: 'Baixe o app', text: 'O paciente instala o app Saúde Unificada e cria a conta com o CPF.' },
  { title: 'Seja atendido', text: 'No atendimento, o profissional acessa e atualiza o prontuário pelo sistema web.' },
  { title: 'Acompanhe tudo', text: 'Receitas, laudos e o histórico ficam disponíveis no app, sempre atualizados.' },
]

const AUDIENCES: { icon: IconName; title: string; text: string; items: string[]; cta: { label: string; to?: string; href?: string } }[] = [
  {
    icon: 'user',
    title: 'Paciente',
    text: 'Seu histórico de saúde no bolso.',
    items: ['Consulte receitas e laudos', 'Veja alergias e medicamentos', 'Leve seu histórico a qualquer médico'],
    cta: { label: 'Baixar o app', href: APP_DOWNLOAD_URL },
  },
  {
    icon: 'stethoscope',
    title: 'Profissional de saúde',
    text: 'Informação completa para decidir melhor.',
    items: ['Busca de paciente por CPF', 'Registro de atendimentos', 'Anexo de receitas e laudos'],
    cta: { label: 'Entrar como médico', to: '/login' },
  },
  {
    icon: 'chart',
    title: 'Gestor público',
    text: 'Dados para planejar a saúde da região.',
    items: ['Indicadores por região e período', 'Condições mais frequentes', 'Evolução mensal de atendimentos'],
    cta: { label: 'Entrar como gestor', to: '/login' },
  },
]

const FAQ = [
  { q: 'Quem pode acessar o meu prontuário?', a: 'Somente profissionais de saúde cadastrados e com registro profissional ativo, durante o atendimento. Gestores públicos veem apenas dados agregados e anônimos por região.' },
  { q: 'Pacientes usam o site?', a: 'Não. Pacientes acessam seus dados pelo aplicativo mobile. O site é usado por profissionais de saúde e gestores públicos.' },
  { q: 'Como meus dados são protegidos?', a: 'O sistema segue os princípios da LGPD: acesso autenticado, registro de quem acessou cada prontuário e dados agregados sem identificação para a gestão.' },
  { q: 'Encontrei uma informação errada no meu histórico. O que faço?', a: 'Fale com o profissional que fez o registro ou acione o suporte pelo chat ou telefone. A correção é feita por um profissional de saúde.' },
  { q: 'Quanto custa?', a: 'Para pacientes, o app é gratuito. Para unidades de saúde e órgãos públicos, a adesão é feita por convênio.' },
]

/* ---------- Componentes da página ---------- */

function SectionTitle({ id, eyebrow, title, text }: { id: string; eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-mint-600">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      {text && <p className="mt-3 text-slate-600">{text}</p>}
    </div>
  )
}

/** Prévia ilustrativa da tela de prontuário (Showroom) */
function ProntuarioPreview() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl" aria-hidden="true">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800">MA</div>
        <div>
          <p className="font-semibold text-slate-900">Maria Aparecida da Silva</p>
          <p className="text-xs text-slate-500">CPF 123.456.789-09 · 68 anos</p>
        </div>
        <span className="ml-auto rounded-lg bg-red-600 px-2.5 py-1 text-sm font-bold text-white">O-</span>
      </div>
      <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-xs font-bold uppercase text-red-700">Alergias</p>
        <p className="text-sm text-red-900">Penicilina (grave) · Dipirona (moderada)</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">Medicamentos</p>
          <p className="text-slate-800">Losartana 50 mg</p>
          <p className="text-slate-800">Metformina 850 mg</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">Condições</p>
          <p className="text-slate-800">Hipertensão</p>
          <p className="text-slate-800">Diabetes tipo 2</p>
        </div>
      </div>
    </div>
  )
}

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const panelId = `faq-panel-${index}`
  return (
    <div className="border-b border-slate-200">
      <h3>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 py-4 text-left font-semibold text-slate-900 hover:text-brand-700"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {q}
          <Icon name="chevronDown" className={`h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="pb-4 text-slate-600">
        {a}
      </div>
    </div>
  )
}

/* ---------- Página ---------- */

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="bg-gradient-to-br from-brand-50 via-white to-mint-50">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-mint-100 px-3 py-1 text-sm font-semibold text-mint-700">
                <Icon name="shield" className="h-4 w-4" /> Integrado pelo CPF
              </p>
              <h1 id="hero-title" className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
                Todo o histórico de saúde do paciente, <span className="text-brand-700">em um só lugar.</span>
              </h1>
              <p className="mt-5 text-lg text-slate-600">
                O Saúde Unificada conecta pacientes, profissionais e gestores em um prontuário único, para atendimentos mais seguros e decisões
                baseadas em dados.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={APP_DOWNLOAD_URL} target="_blank" rel="noreferrer" className={buttonClasses('secondary', 'lg')}>
                  <Icon name="download" /> Baixar o app
                </a>
                <ButtonLink to="/login" variant="outline" size="lg">
                  Entrar como profissional
                </ButtonLink>
              </div>
            </div>
            <ProntuarioPreview />
          </div>
        </section>

        {/* Proposta de valor */}
        <section id="proposta" aria-labelledby="proposta-title" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle
              id="proposta-title"
              eyebrow="Proposta de valor"
              title="Menos papel perdido, mais cuidado"
              text="Hoje as informações de saúde ficam espalhadas entre hospitais, clínicas e UBS. Nós juntamos tudo em um histórico confiável."
            />
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {VALUE_PROPS.map((item) => (
                <li key={item.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                    <Icon name={item.icon} className="h-6 w-6" />
                  </span>
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Prova social */}
        <section aria-labelledby="prova-title" className="bg-brand-800 py-20 text-white">
          <div className="mx-auto max-w-6xl px-4">
            <h2 id="prova-title" className="text-center text-3xl font-bold">
              Quem usa, recomenda
            </h2>
            <dl className="mt-10 grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="flex flex-col-reverse">
                  <dt className="text-sm text-brand-100">{s.label}</dt>
                  <dd className="text-3xl font-extrabold text-mint-100">{s.value}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-12 grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <li key={t.name}>
                  <figure className="h-full rounded-xl bg-white/10 p-6">
                    <blockquote className="text-brand-50">“{t.quote}”</blockquote>
                    <figcaption className="mt-4 text-sm">
                      <span className="font-semibold text-white">{t.name}</span>
                      <span className="block text-brand-200">{t.role}</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-center text-xs text-brand-200">Números e depoimentos ilustrativos da fase piloto.</p>
          </div>
        </section>

        {/* Showroom + Primeiros passos */}
        <section id="como-funciona" aria-labelledby="como-title" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle id="como-title" eyebrow="Showroom" title="Veja como funciona" text="Uma interface clara, pensada para a rotina corrida de quem atende." />
            <div className="grid items-center gap-12 md:grid-cols-2">
              <ProntuarioPreview />
              <div>
                <h3 className="text-xl font-bold text-slate-900">Primeiros passos</h3>
                <ol className="mt-6 space-y-6">
                  {STEPS.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint-600 font-bold text-white" aria-hidden="true">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{step.title}</p>
                        <p className="text-sm text-slate-600">{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Para quem é */}
        <section id="para-quem" aria-labelledby="para-quem-title" className="scroll-mt-20 bg-white py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle id="para-quem-title" eyebrow="Para quem é" title="Uma plataforma, três jeitos de usar" />
            <ul className="grid gap-6 md:grid-cols-3">
              {AUDIENCES.map((a) => (
                <li key={a.title} className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-6">
                  <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-mint-100 text-mint-700">
                    <Icon name={a.icon} className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{a.text}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                    {a.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Icon name="check" className="mt-0.5 h-4 w-4 text-mint-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    {a.cta.to ? (
                      <ButtonLink to={a.cta.to} variant="outline" className="w-full">
                        {a.cta.label}
                      </ButtonLink>
                    ) : (
                      <a href={a.cta.href} target="_blank" rel="noreferrer" className={buttonClasses('secondary', 'md', 'w-full')}>
                        {a.cta.label}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section aria-labelledby="cta-title" className="py-20">
          <div className="mx-auto max-w-4xl px-4">
            <div className="rounded-2xl bg-gradient-to-r from-brand-700 to-mint-600 px-8 py-12 text-center text-white shadow-lg">
              <h2 id="cta-title" className="text-3xl font-bold">
                Comece agora
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-brand-50">
                Paciente? Baixe o app. Profissional de saúde ou gestor? Entre com sua conta institucional.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href={APP_DOWNLOAD_URL} target="_blank" rel="noreferrer" className={buttonClasses('outline', 'lg')}>
                  <Icon name="download" /> Baixar o app
                </a>
                <ButtonLink to="/login" size="lg" variant="inverse">
                  Entrar
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 bg-white py-20">
          <div className="mx-auto max-w-3xl px-4">
            <SectionTitle id="faq-title" eyebrow="FAQ" title="Perguntas frequentes" />
            <div className="border-t border-slate-200">
              {FAQ.map((item, i) => (
                <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Suporte */}
        <section id="suporte" aria-labelledby="suporte-title" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle id="suporte-title" eyebrow="Suporte" title="Precisa de ajuda?" text="Nossa equipe atende de segunda a sexta, das 8h às 18h." />
            <ul className="grid gap-6 md:grid-cols-3">
              <li className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <Icon name="phone" className="mx-auto h-8 w-8 text-brand-700" />
                <h3 className="mt-3 font-semibold">Telefone</h3>
                <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`} className="text-brand-700 underline-offset-2 hover:underline">
                  {SUPPORT_PHONE}
                </a>
              </li>
              <li className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <Icon name="mail" className="mx-auto h-8 w-8 text-brand-700" />
                <h3 className="mt-3 font-semibold">E-mail</h3>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all text-brand-700 underline-offset-2 hover:underline">
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <Icon name="chat" className="mx-auto h-8 w-8 text-brand-700" />
                <h3 className="mt-3 font-semibold">Chat de ajuda</h3>
                <p className="text-sm text-slate-600">Clique no botão de chat no canto inferior direito.</p>
              </li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
