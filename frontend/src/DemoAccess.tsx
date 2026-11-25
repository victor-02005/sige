import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { demoProfileKeys, demoProfiles } from './demoProfiles'

export default function DemoAccess({ onEnter }: { onEnter: (email: string, password: string) => boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Iniciar sesión | SIGE'
    heading.current?.focus()
  }, [])

  return (
    <main className="grid min-h-dvh place-items-center bg-brand-ink px-4 py-8">
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-3 font-semibold text-brand-ink">
          <span className="grid size-9 place-items-center rounded-lg bg-brand-green text-white" aria-hidden="true">S</span>
          SIGE
        </div>
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <form className="mt-6 grid gap-4" onSubmit={(event) => {
          event.preventDefault()
          if (!onEnter(email.trim().toLowerCase(), password)) {
            setError('El correo o la clave es incorrecto.')
            return
          }
          navigate('/inicio', { replace: true })
        }}>
          <div>
            <label className="field-label" htmlFor="demo-email">Correo electrónico</label>
            <input className="field" id="demo-email" type="email" autoComplete="username" required value={email}
              onChange={(event) => { setEmail(event.target.value); setError('') }} />
          </div>
          <div>
            <label className="field-label" htmlFor="demo-password">Clave</label>
            <input className="field" id="demo-password" type="password" autoComplete="current-password" required value={password}
              aria-describedby={error ? 'demo-email-error' : undefined}
              onChange={(event) => { setPassword(event.target.value); setError('') }} />
          </div>
          {error && <p className="field-error" id="demo-email-error" role="alert">{error}</p>}
          <button className="button button-primary" type="submit">Entrar</button>
        </form>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold text-brand-green">Correos y claves de prueba</summary>
          <ul className="mt-2 grid gap-2">
            {demoProfileKeys.map((key) => (
              <li key={key}>
                <button className="min-h-11 cursor-pointer text-left text-brand-green underline" type="button" onClick={() => {
                  setEmail(demoProfiles[key].email)
                  setPassword('')
                  setError('')
                }}>{demoProfiles[key].label} · {demoProfiles[key].email}</button>
                <p className="text-muted">Clave: <code>{demoProfiles[key].password}</code></p>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </main>
  )
}
