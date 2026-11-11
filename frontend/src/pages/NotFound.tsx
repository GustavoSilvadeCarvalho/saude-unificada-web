import { Link, useLocation } from 'react-router-dom'
import { SiteFooter } from '../components/layout/SiteFooter'
import { SiteHeader } from '../components/layout/SiteHeader'

// Atalhos para onde a pessoa provavelmente queria ir
const LINKS = [
  { to: '/', label: 'Página inicial', text: 'O que é o Saúde Unificada e como funciona.' },
  { to: '/login', label: 'Entrar', text: 'Área do médico e do gestor.' },
  { to: '/verificar', label: 'Conferir receita', text: 'Para farmácias: confira um documento pelo código.' },
]

export default function NotFound() {
  const { pathname } = useLocation()
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <p className="text-sm text-slate-500">Erro 404</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-slate-900 md:text-4xl">Essa página não existe.</h1>
        <p className="mt-4 text-lg text-slate-700">
          Não encontramos nada em <span className="break-all font-mono text-base text-slate-900">{pathname}</span>. Pode ter sido um erro de
          digitação ou um link antigo.
        </p>
        <ul className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="flex flex-col gap-x-4 px-1 py-3.5 hover:bg-white sm:flex-row sm:items-baseline sm:justify-between">
                <span className="font-semibold text-brand-700">{l.label} →</span>
                <span className="text-slate-600">{l.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  )
}
