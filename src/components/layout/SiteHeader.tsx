import { useState } from 'react'
import { ButtonLink } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Logo } from './Logo'

const NAV_LINKS = [
  { href: '#proposta', label: 'Proposta' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#para-quem', label: 'Para quem é' },
  { href: '#faq', label: 'Dúvidas' },
  { href: '#suporte', label: 'Suporte' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const user = null as { role: string } | null
  const panelLink = '/login'

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo />

        <nav aria-label="Seções da página" className="hidden md:block">
          <ul className="flex items-center gap-6 text-sm font-medium text-slate-600">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="hover:text-brand-700">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden md:block">
          <ButtonLink to={panelLink} size="sm">
            {user ? 'Ir para o painel' : 'Entrar'}
          </ButtonLink>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'menu'} className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <nav id="menu-mobile" aria-label="Seções da página" className="border-t border-slate-200 px-4 pb-4 md:hidden">
          <ul className="flex flex-col py-2 text-sm font-medium text-slate-700">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="block rounded px-2 py-2.5 hover:bg-slate-100" onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <ButtonLink to={panelLink} className="w-full">
            {user ? 'Ir para o painel' : 'Entrar'}
          </ButtonLink>
        </nav>
      )}
    </header>
  )
}
