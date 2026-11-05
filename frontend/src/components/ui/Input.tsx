import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const fieldBase =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100'

function fieldClasses(error?: string) {
  return `${fieldBase} ${error ? 'border-red-500' : 'border-slate-300'}`
}

interface FieldWrapperProps {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}

/** Label + campo + mensagens de ajuda/erro, ligados por aria-describedby */
function FieldWrapper({ id, label, error, hint, required, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldWrapper id={fieldId} label={label} error={error} hint={hint} required={props.required}>
      <input
        id={fieldId}
        className={`${fieldClasses(error)} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        {...props}
      />
    </FieldWrapper>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, id, className = '', ...props }: TextareaProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldWrapper id={fieldId} label={label} error={error} hint={hint} required={props.required}>
      <textarea
        id={fieldId}
        className={`${fieldClasses(error)} min-h-28 ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        {...props}
      />
    </FieldWrapper>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, hint, id, options, className = '', ...props }: SelectProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldWrapper id={fieldId} label={label} error={error} hint={hint} required={props.required}>
      <select
        id={fieldId}
        className={`${fieldClasses(error)} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  )
}
