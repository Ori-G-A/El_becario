import { useState, type FormEvent } from 'react'
import { Mail, Send } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { AuthShell } from '../components/AuthShell'
import { inputStyle } from '../components/styles'

export function LoginScreen() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setStatus('sending')
    const { error } = await signInWithEmail(email.trim())
    if (error) {
      setError(error)
      setStatus('idle')
    } else {
      setStatus('sent')
    }
  }

  if (status === 'sent') {
    return (
      <AuthShell
        badge="Acceso · magic link"
        title="Te envié un correo"
        subtitle={`Revisa ${email} y abre el enlace para entrar. Mira también el spam, no me ofendo.`}
      >
        <button
          type="button"
          className="btn"
          onClick={() => setStatus('idle')}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Usar otro correo
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      badge="Acceso · magic link"
      title="El Becario"
      subtitle="Sin contraseñas. Escribe tu correo y te envío un enlace de un solo uso."
    >
      <form onSubmit={onSubmit}>
        <label
          className="mono-tag"
          htmlFor="email"
          style={{ display: 'block', marginBottom: '0.4rem' }}
        >
          Tu correo
        </label>
        <div style={{ position: 'relative', marginBottom: '0.9rem' }}>
          <Mail
            size={18}
            aria-hidden
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.6,
            }}
          />
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            style={{ ...inputStyle, paddingLeft: 38 }}
          />
        </div>

        {error && (
          <p style={{ color: 'var(--rag-rojo)', fontWeight: 600, marginBottom: '0.75rem' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn"
          disabled={status === 'sending'}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <Send size={18} aria-hidden />
          {status === 'sending' ? 'Enviando…' : 'Envíame el enlace'}
        </button>
      </form>
    </AuthShell>
  )
}
