import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { demoProfiles } from './demoProfiles'
import type { DemoProfile } from './demoProfiles'

export type RecordOperation = (action: string, detail: string) => void
type Operation = { id: string; at: Date; actor: string; action: string; detail: string }
const timestamp = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'America/Bogota' })

export function useAudit(profile: DemoProfile | null) {
  const [operations, setOperations] = useState<Operation[]>([])

  function record(action: string, detail: string) {
    if (!profile) return
    const operation = { id: crypto.randomUUID(), at: new Date(), actor: demoProfiles[profile].label, action, detail }
    setOperations((current) => [operation, ...current])
  }

  return { operations, record }
}

export function AuditLog({ operations }: { operations: Operation[] }) {
  const [actor, setActor] = useState('')
  const matches = operations.filter((item) => !actor || item.actor === actor)
  return (
    <section className="panel mt-5 max-w-4xl" aria-label="Historial de operaciones">
      <label className="field-label" htmlFor="audit-actor">Perfil que realizó la operación</label>
      <select className="field max-w-xs" id="audit-actor" value={actor} onChange={(event) => setActor(event.target.value)}>
        <option value="">Todos los perfiles</option>
        {Object.values(demoProfiles).map(({ label }) => <option key={label}>{label}</option>)}
      </select>
      {matches.length === 0 ? <p className="mt-4 text-sm text-muted" role="status">Todavía no hay operaciones para este filtro.</p> : (
        <ul className="mt-3 divide-y divide-line">
          {matches.map(({ id, at, actor, action, detail }) => (
            <li className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 [overflow-wrap:anywhere]" key={id}>
              <div><p className="font-semibold">{action}</p><p className="text-sm text-muted">{detail}</p></div>
              <p className="text-sm text-muted">{actor} · <time dateTime={at.toISOString()}>{timestamp.format(at)}</time></p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const institutionFields = [
  { key: 'name', label: 'Nombre de la institución' },
  { key: 'campus', label: 'Nombre de la sede' },
  { key: 'city', label: 'Municipio' },
] as const

export function useInstitution(record: RecordOperation) {
  const [info, setInfo] = useState({ name: '', campus: '', city: '' })

  function save(next: typeof info) {
    if (!institutionFields.some(({ key }) => info[key] !== next[key])) return false
    setInfo(next)
    record('Actualizó institución y sede', next.name)
    return true
  }

  return { info, save }
}

export function Institution({ info, save }: ReturnType<typeof useInstitution>) {
  const [message, setMessage] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next = { name: String(data.get('name')).trim(), campus: String(data.get('campus')).trim(), city: String(data.get('city')).trim() }
    if (!next.name || !next.campus || !next.city) return
    setMessage(save(next) ? 'Datos guardados.' : 'Los datos ya están guardados.')
  }

  return (
    <section className="panel mt-5 max-w-xl" aria-label="Datos institucionales">
      <form className="mt-4 grid gap-4" onSubmit={submit} onChange={() => setMessage('')}>
        {institutionFields.map(({ key, label }) => (
          <div key={key}>
            <label className="field-label" htmlFor={`institution-${key}`}>{label}</label>
            <input className="field" id={`institution-${key}`} name={key} defaultValue={info[key]} required pattern=".*\S.*" maxLength={100} />
          </div>
        ))}
        <button className="button button-primary w-fit" type="submit">Guardar datos</button>
      </form>
      <div role="status">{message && <p className="notice mt-4">{message}</p>}</div>
    </section>
  )
}

type DemoUser = { id: string; name: string; email: string; password: string; role: DemoProfile; active: boolean }

export function useDemoUsers(record: RecordOperation) {
  const [users, setUsers] = useState<DemoUser[]>([])

  function save(user: Omit<DemoUser, 'id'>, selected?: DemoUser) {
    if (Object.values(demoProfiles).some((profile) => profile.email === user.email)
      || users.some((item) => item.id !== selected?.id && item.email === user.email)) return 'Ya existe una cuenta con ese correo.'
    const id = selected?.id ?? crypto.randomUUID()
    const item = { ...user, id }
    setUsers((current) => selected ? current.map((entry) => entry.id === id ? item : entry) : [...current, item])
    record(selected ? 'Actualizó usuario' : 'Creó usuario', `${user.name} · ${demoProfiles[user.role].label} · ${user.active ? 'Activo' : 'Inactivo'}`)
    return ''
  }

  return { users, save }
}

function UserForm({ selected, onSave, onCancel }: {
  selected?: DemoUser
  onSave: (value: Omit<DemoUser, 'id'>) => string
  onCancel: () => void
}) {
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const role = data.get('role')
    const name = String(data.get('name')).trim()
    if (!name || (role !== 'secretaria' && role !== 'tesoreria' && role !== 'administracion' && role !== 'completo')) return
    const email = String(data.get('email')).trim().toLowerCase()
    const password = String(data.get('password')) || selected?.password || ''
    if (!password.trim()) {
      setError('Escribe una clave.')
      return
    }
    setError(onSave({ name, email, password, role, active: data.get('active') === 'active' }))
  }

  return (
    <section className="panel mt-4 max-w-xl" aria-labelledby="user-form-heading">
      <h2 id="user-form-heading" className="text-lg font-semibold">{selected ? 'Editar usuario' : 'Datos de acceso'}</h2>
      <form className="mt-4 grid gap-4" onSubmit={submit}>
        <div>
          <label className="field-label" htmlFor="user-name">Nombre completo</label>
          <input className="field" name="name" id="user-name" defaultValue={selected?.name} required pattern=".*\S.*" maxLength={100} />
        </div>
        <div>
          <label className="field-label" htmlFor="user-email">Correo electrónico</label>
          <input className="field" id="user-email" name="email" type="email" required maxLength={150} defaultValue={selected?.email} />
        </div>
        <div>
          <label className="field-label" htmlFor="user-password">{selected ? 'Nueva clave (opcional)' : 'Clave'}</label>
          <input className="field" id="user-password" name="password" type="password" autoComplete="new-password" required={!selected} maxLength={128} />
        </div>
        <div>
          <label className="field-label" htmlFor="user-role">Rol</label>
          <select className="field" id="user-role" name="role" defaultValue={selected?.role ?? 'secretaria'}>
            {Object.entries(demoProfiles).map(([role, { label }]) => <option key={role} value={role}>{label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="user-active">Estado</label>
          <select className="field" id="user-active" name="active" defaultValue={selected?.active === false ? 'inactive' : 'active'}>
            <option value="active">Activo</option><option value="inactive">Inactivo</option>
          </select>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="button button-primary" type="submit">Guardar usuario</button>
          <button className="button button-secondary" type="button" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </section>
  )
}

export function NewUser({ save }: Pick<ReturnType<typeof useDemoUsers>, 'save'>) {
  const navigate = useNavigate()
  return (
    <>
      <UserForm onCancel={() => navigate('/usuarios-y-roles')} onSave={(user) => {
        const error = save(user)
        if (!error) navigate('/usuarios-y-roles', { replace: true, state: { created: true } })
        return error
      }} />
    </>
  )
}

export function UsersAndRoles({ users, save }: ReturnType<typeof useDemoUsers>) {
  const [selection, setSelection] = useState<string | null>(null)
  const { state } = useLocation()
  const [message, setMessage] = useState(state?.created ? 'Usuario agregado.' : '')
  const selected = users.find((user) => user.id === selection)

  return (
    <div className="mt-5 max-w-4xl">
      <Link className="button button-primary inline-flex items-center" to="/usuarios-y-roles/nuevo">Agregar usuario</Link>
      <div role="status">{message && <p className="notice mt-4">{message}</p>}</div>
      {selected && <UserForm key={selection} selected={selected} onCancel={() => setSelection(null)} onSave={(value) => {
        const error = save(value, selected)
        if (error) return error
        setSelection(null)
        setMessage('Usuario actualizado.')
        return ''
      }} />}
      <section className="panel mt-4" aria-label="Listado de usuarios">
        {users.length === 0 && <p className="text-sm text-muted" role="status">Todavía no has agregado usuarios.</p>}
        <ul className="divide-y divide-line">
          {users.map(({ id, name, email, role, active }) => (
            <li className="flex flex-wrap items-center justify-between gap-2 py-3 [overflow-wrap:anywhere]" key={id}>
              <div className="min-w-0">
                <p className="font-semibold">{name}</p>
                <p className="text-sm text-muted">{email}</p>
                <p className="text-sm text-muted">{demoProfiles[role].label} · {active ? 'Activo' : 'Inactivo'}</p>
              </div>
              <button className="button button-secondary" type="button" aria-label={`Editar a ${name}`} onClick={() => { setSelection(id); setMessage('') }}>Editar</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
