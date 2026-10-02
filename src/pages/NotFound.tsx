import { ButtonLink } from '../components/ui/Button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-extrabold text-brand-700">404</p>
      <h1 className="text-2xl font-bold text-slate-900">Página não encontrada</h1>
      <p className="text-slate-600">O endereço acessado não existe ou foi movido.</p>
      <ButtonLink to="/">Voltar ao início</ButtonLink>
    </main>
  )
}
