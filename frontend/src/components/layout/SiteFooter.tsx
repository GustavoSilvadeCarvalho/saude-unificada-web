import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../../config'
import { Logo } from './Logo'

export function SiteFooter() {
  return (
    <footer className="bg-brand-900 text-brand-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div className="space-y-3">
          <Logo light />
          <p className="text-sm">Seu histórico de saúde em um só lugar, integrado pelo CPF.</p>
        </div>
        <div className="text-sm">
          <h2 className="mb-2 font-semibold text-white">Contato</h2>
          <p>{SUPPORT_PHONE}</p>
          <p>{SUPPORT_EMAIL}</p>
        </div>
        <div className="text-sm">
          <h2 className="mb-2 font-semibold text-white">Projeto</h2>
          <p>Projeto Integrador — Desenvolvimento de Software Multiplataforma (DSM).</p>
          <p className="mt-1 text-brand-200">Dados exibidos são fictícios.</p>
        </div>
      </div>
      <p className="border-t border-brand-800 py-4 text-center text-xs text-brand-200">
        © {new Date().getFullYear()} Saúde Unificada
      </p>
    </footer>
  )
}
