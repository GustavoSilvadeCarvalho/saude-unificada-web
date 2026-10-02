import { useEffect, useRef, useState } from 'react'
import { APP_DOWNLOAD_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from '../config'
import { Icon } from './ui/Icon'

// Chatbot de suporte com respostas prontas (sem IA): cada nó tem uma mensagem
// e opções que levam a outros nós.

type NodeId =
  | 'start'
  | 'wrongData'
  | 'wrongDataPatient'
  | 'wrongDataDoctor'
  | 'access'
  | 'forgotPassword'
  | 'blocked'
  | 'patientAccess'
  | 'downloadApp'
  | 'contact'
  | 'thanks'

interface ChatNode {
  message: string
  link?: { href: string; label: string }
  options: { label: string; next: NodeId }[]
}

const BACK_OPTIONS: ChatNode['options'] = [
  { label: 'Voltar ao início', next: 'start' },
  { label: 'Falar com o suporte', next: 'contact' },
]

const FLOW: Record<NodeId, ChatNode> = {
  start: {
    message: 'Olá! Sou o assistente do Saúde Unificada. Como posso ajudar?',
    options: [
      { label: 'Encontrei dados errados', next: 'wrongData' },
      { label: 'Não consigo acessar', next: 'access' },
      { label: 'Como baixar o app', next: 'downloadApp' },
      { label: 'Falar com o suporte', next: 'contact' },
    ],
  },
  wrongData: {
    message: 'Entendi. Você é paciente ou profissional de saúde?',
    options: [
      { label: 'Sou paciente', next: 'wrongDataPatient' },
      { label: 'Sou profissional de saúde', next: 'wrongDataDoctor' },
      { label: 'Voltar ao início', next: 'start' },
    ],
  },
  wrongDataPatient: {
    message:
      'Por segurança, só profissionais de saúde podem alterar o prontuário. Informe a correção no seu próximo atendimento. Se o dado for crítico (alergia ou tipo sanguíneo), fale com o suporte para agilizar.',
    options: BACK_OPTIONS,
  },
  wrongDataDoctor: {
    message:
      'Você pode complementar o prontuário registrando um novo atendimento. Para corrigir um registro feito por outro profissional, envie ao suporte o CPF do paciente e a descrição do erro. Toda correção fica registrada no histórico.',
    options: BACK_OPTIONS,
  },
  access: {
    message: 'Vamos resolver. Qual é a situação?',
    options: [
      { label: 'Esqueci minha senha', next: 'forgotPassword' },
      { label: 'Minha conta está bloqueada', next: 'blocked' },
      { label: 'Sou paciente e quero acessar', next: 'patientAccess' },
      { label: 'Voltar ao início', next: 'start' },
    ],
  },
  forgotPassword: {
    message:
      'A senha é redefinida pelo administrador da sua unidade de saúde ou órgão. Se não souber quem é, o suporte encaminha o pedido. Tenha em mãos seu e-mail institucional e o número do conselho (CRM, COREN...).',
    options: BACK_OPTIONS,
  },
  blocked: {
    message:
      'Após 5 tentativas de senha incorretas, o acesso é bloqueado por 30 minutos. Se o bloqueio continuar depois disso, fale com o suporte.',
    options: BACK_OPTIONS,
  },
  patientAccess: {
    message: 'Pacientes acessam o histórico pelo aplicativo mobile, não pelo site. Baixe o app e entre com seu CPF.',
    link: { href: APP_DOWNLOAD_URL, label: 'Baixar o app' },
    options: BACK_OPTIONS,
  },
  downloadApp: {
    message:
      'O app Saúde Unificada está disponível para Android e iPhone. Procure por "Saúde Unificada" na loja do seu celular, instale e crie a conta com seu CPF.',
    link: { href: APP_DOWNLOAD_URL, label: 'Abrir a loja de apps' },
    options: BACK_OPTIONS,
  },
  contact: {
    message: `Nossa equipe atende de segunda a sexta, das 8h às 18h.\nTelefone: ${SUPPORT_PHONE}\nE-mail: ${SUPPORT_EMAIL}`,
    link: { href: `mailto:${SUPPORT_EMAIL}`, label: 'Enviar e-mail' },
    options: [
      { label: 'Voltar ao início', next: 'start' },
      { label: 'Era só isso, obrigado!', next: 'thanks' },
    ],
  },
  thanks: {
    message: 'Por nada! Se precisar, é só chamar.',
    options: [{ label: 'Voltar ao início', next: 'start' }],
  },
}

interface ChatMessage {
  from: 'bot' | 'user'
  text: string
  link?: ChatNode['link']
}

function botMessage(id: NodeId): ChatMessage {
  return { from: 'bot', text: FLOW[id].message, link: FLOW[id].link }
}

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<NodeId>('start')
  const [messages, setMessages] = useState<ChatMessage[]>([botMessage('start')])
  const logRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Rola para a última mensagem
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  // Ao abrir, leva o foco para o painel; Esc fecha e devolve o foco ao botão
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  function choose(label: string, next: NodeId) {
    setMessages((list) => [...list, { from: 'user', text: label }, botMessage(next)])
    setCurrent(next)
  }

  function restart() {
    setMessages([botMessage('start')])
    setCurrent('start')
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-3">
      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="chatbot-title"
          className="flex h-[min(32rem,calc(100vh-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl focus:outline-none"
        >
          <header className="flex items-center justify-between bg-brand-700 px-4 py-3 text-white">
            <div>
              <h2 id="chatbot-title" className="font-semibold">
                Suporte
              </h2>
              <p className="text-xs text-brand-100">Respostas automáticas</p>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={restart} className="rounded-lg px-2 py-1 text-xs font-medium hover:bg-white/15">
                Reiniciar
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar chat" className="rounded-lg p-1 hover:bg-white/15">
                <Icon name="close" />
              </button>
            </div>
          </header>

          <div ref={logRef} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${
                    m.from === 'user' ? 'rounded-br-sm bg-brand-700 text-white' : 'rounded-bl-sm bg-white text-slate-800 shadow-sm'
                  }`}
                >
                  <span className="sr-only">{m.from === 'user' ? 'Você: ' : 'Assistente: '}</span>
                  {m.text}
                  {m.link && (
                    <a
                      href={m.link.href}
                      target={m.link.href.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                      className="mt-2 block font-semibold text-brand-700 underline"
                    >
                      {m.link.label}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <p className="sr-only">Escolha uma opção:</p>
            <div className="flex flex-wrap gap-2">
              {FLOW[current].options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => choose(option.label, option.next)}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800 hover:border-brand-500 hover:bg-brand-100"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Fechar chat de suporte' : 'Abrir chat de suporte'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-mint-700"
      >
        <Icon name={open ? 'close' : 'chat'} className="h-7 w-7" />
      </button>
    </div>
  )
}
