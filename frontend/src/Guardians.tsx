import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Student } from './Students'
import type { RecordOperation } from './Administration'

type Guardian = { id: string; name: string; email: string }
type GuardianLink = { studentId: string; guardianId: string; relationship: string }

export function useGuardianDirectory(record: RecordOperation) {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [links, setLinks] = useState<GuardianLink[]>([])
  const [payers, setPayers] = useState<Record<string, string>>({})

  function createGuardian(data: Omit<Guardian, 'id'>) {
    const id = crypto.randomUUID()
    setGuardians((current) => [...current, { ...data, id }])
    record('Creó acudiente', data.name)
    return id
  }

  function linkGuardian(link: GuardianLink) {
    if (links.some((item) => item.studentId === link.studentId && item.guardianId === link.guardianId)) return
    setLinks((current) => current.some((item) => item.studentId === link.studentId && item.guardianId === link.guardianId)
      ? current
      : [...current, link])
    record('Vinculó acudiente', link.relationship)
  }

  function setPayer(studentId: string, guardianId: string) {
    setPayers((current) => ({ ...current, [studentId]: guardianId }))
    record('Asignó responsable de pago', guardians.find((item) => item.id === guardianId)?.name ?? 'Acudiente')
  }

  return { guardians, links, payers, createGuardian, linkGuardian, setPayer }
}

export type GuardianDirectory = ReturnType<typeof useGuardianDirectory>

function Heading({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} | SIGE`
  }, [title])
  return <h1 tabIndex={-1} className="text-3xl font-semibold tracking-tight">{title}</h1>
}

function Relationship() {
  return (
    <div>
      <label className="field-label" htmlFor="guardian-relationship">Parentesco o relación</label>
      <select className="field" id="guardian-relationship" name="relationship" defaultValue="" required>
        <option value="">Selecciona una relación</option>
        <option>Madre</option>
        <option>Padre</option>
        <option>Abuela o abuelo</option>
        <option>Tutor o tutora</option>
        <option>Otra relación</option>
      </select>
    </div>
  )
}

function GuardianForm({ children, button, onSave }: {
  children?: ReactNode
  button: string
  onSave: (data: Omit<Guardian, 'id'>, fields: FormData) => void
}) {
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const name = String(fields.get('name')).trim()
    if (!name) {
      setError('Escribe el nombre del acudiente.')
      form.querySelector<HTMLInputElement>('#guardian-name')?.focus()
      return
    }
    onSave({ name, email: String(fields.get('email')).trim() }, fields)
    setError('')
    form.reset()
  }

  return (
    <form className="mt-4 grid max-w-lg gap-4" onSubmit={submit}>
      <div>
        <label className="field-label" htmlFor="guardian-name">Nombre completo</label>
        <input className="field" id="guardian-name" name="name" maxLength={100} required aria-invalid={!!error} aria-describedby={error ? 'guardian-name-error' : undefined} />
        {error && <p className="field-error" id="guardian-name-error" role="alert">{error}</p>}
      </div>
      <div>
        <label className="field-label" htmlFor="guardian-email">Correo electrónico (opcional)</label>
        <input className="field" id="guardian-email" name="email" type="email" maxLength={150} />
      </div>
      {children}
      <button className="button button-primary w-fit" type="submit">{button}</button>
    </form>
  )
}

export function StudentGuardians({ student, directory, canManage }: { student: Student; directory: GuardianDirectory; canManage: boolean }) {
  const [mode, setMode] = useState<'existing' | 'new' | null>(null)
  const [message, setMessage] = useState('')
  const links = directory.links.filter((link) => link.studentId === student.id)
  const available = directory.guardians.filter((guardian) => !links.some((link) => link.guardianId === guardian.id))

  function attach(guardianId: string, fields: FormData) {
    directory.linkGuardian({ studentId: student.id, guardianId, relationship: String(fields.get('relationship')) })
    setMessage('Acudiente vinculado.')
    setMode(null)
  }

  return (
    <section className="panel mt-5" aria-labelledby="student-guardians">
      <h2 id="student-guardians" className="text-lg font-semibold">Acudientes</h2>
      <div role="status">{message && <p className="notice mt-3">{message}</p>}</div>
      {links.length === 0 && <p className="mt-2 text-sm text-muted">Este estudiante aún no tiene acudientes vinculados.</p>}
      <ul className="mt-2 divide-y divide-line">
        {links.map(({ guardianId, relationship }) => {
          const guardian = directory.guardians.find((item) => item.id === guardianId)
          const payer = directory.payers[student.id] === guardianId
          if (!guardian) return null
          return (
            <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={guardianId}>
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <Link className="font-semibold text-brand-green underline underline-offset-4" to={`/acudientes/${guardianId}`}>{guardian.name}</Link>
                <p className="text-sm text-muted">{relationship}</p>
              </div>
              {payer ? <span className="status status-active">Responsable de pago</span> : canManage && !student.archived && (
                <button className="button button-secondary" type="button" onClick={() => {
                  directory.setPayer(student.id, guardianId)
                  setMessage(`${guardian.name} es responsable de pago para este estudiante.`)
                }}>
                  Marcar como responsable
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {canManage && !student.archived && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {available.length > 0 && (
              <button className="button button-secondary" type="button" aria-expanded={mode === 'existing'} onClick={() => setMode(mode === 'existing' ? null : 'existing')}>Vincular existente</button>
            )}
            <button className="button button-secondary" type="button" aria-expanded={mode === 'new'} onClick={() => setMode(mode === 'new' ? null : 'new')}>Crear y vincular</button>
          </div>
          {mode === 'existing' && (
            <form className="mt-4 grid max-w-lg gap-4" onSubmit={(event) => {
              event.preventDefault()
              const fields = new FormData(event.currentTarget)
              attach(String(fields.get('guardian')), fields)
            }}>
              <div>
                <label className="field-label" htmlFor="existing-guardian">Acudiente</label>
                <select className="field" id="existing-guardian" name="guardian" defaultValue="" required>
                  <option value="">Selecciona un acudiente</option>
                  {available.map(({ id, name, email }) => (
                    <option key={id} value={id}>{email ? `${name} · ${email}` : name}</option>
                  ))}
                </select>
              </div>
              <Relationship />
              <button className="button button-primary w-fit" type="submit">Vincular acudiente</button>
            </form>
          )}
          {mode === 'new' && (
            <>
              <GuardianForm button="Guardar y vincular" onSave={(data, fields) => attach(directory.createGuardian(data), fields)}>
                <Relationship />
              </GuardianForm>
            </>
          )}
        </>
      )}
    </section>
  )
}

function GuardianList({ guardians, canManage }: { guardians: Guardian[]; canManage: boolean }) {
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  const query = params.get('q') ?? ''
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es-CO')
  const matches = guardians.filter(({ name, email }) => normalize(`${name} ${email}`).includes(normalize(query.trim())))

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading title="Acudientes" />
        {canManage && <Link className="button button-primary inline-flex items-center" to={{ pathname: '/acudientes/nuevo', search }}>Nuevo acudiente</Link>}
      </div>
      <section className="panel mt-5" aria-label="Listado de acudientes">
        <label className="field-label" htmlFor="guardian-search">Buscar por nombre o correo</label>
        <input className="field max-w-md" id="guardian-search" type="search" value={query} onChange={(event) => {
          const value = event.target.value
          setParams(value ? { q: value } : {}, { replace: true })
        }} />
        {matches.length === 0 && <p className="mt-3 text-sm text-muted" role="status">No hay acudientes que coincidan.</p>}
        <ul className="mt-2 divide-y divide-line">
          {matches.map(({ id, name, email }) => (
            <li className="py-3 [overflow-wrap:anywhere]" key={id}>
              <Link className="font-semibold text-brand-green underline underline-offset-4" to={{ pathname: `/acudientes/${id}`, search }}>{name}</Link>
              {email && <p className="mt-1 text-sm text-muted">{email}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function BackToGuardians() {
  const { search } = useLocation()
  return <Link className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green underline underline-offset-4" to={{ pathname: '/acudientes', search }}>Volver a Acudientes</Link>
}

function NewGuardian({ directory }: { directory: GuardianDirectory }) {
  const navigate = useNavigate()
  const { search } = useLocation()
  return (
    <div className="max-w-xl">
      <BackToGuardians />
      <Heading title="Nuevo acudiente" />
      <div className="panel mt-5">
        <GuardianForm button="Guardar acudiente" onSave={(data) => {
          navigate({ pathname: `/acudientes/${directory.createGuardian(data)}`, search }, { replace: true })
        }} />
      </div>
    </div>
  )
}

function GuardianDetails({ directory, students }: { directory: GuardianDirectory; students: Student[] }) {
  const { id } = useParams()
  const guardian = directory.guardians.find((item) => item.id === id)
  if (!guardian) return <><BackToGuardians /><Heading title="Acudiente no encontrado" /></>
  const links = directory.links.filter((link) => link.guardianId === guardian.id)

  return (
    <div className="max-w-3xl">
      <BackToGuardians />
      <Heading title={guardian.name} />
      {guardian.email && <p className="mt-2 text-sm text-muted [overflow-wrap:anywhere]">{guardian.email}</p>}
      <section className="panel mt-5" aria-labelledby="linked-students">
        <h2 id="linked-students" className="text-lg font-semibold">Estudiantes vinculados</h2>
        {links.length === 0 && <p className="mt-2 text-sm text-muted">Puedes vincular a este acudiente desde la ficha de un estudiante.</p>}
        <ul className="mt-2 divide-y divide-line">
          {links.map(({ studentId, relationship }) => {
            const student = students.find((item) => item.id === studentId)
            if (!student) return null
            return (
              <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={studentId}>
                <div>
                  <Link className="font-semibold text-brand-green underline underline-offset-4" to={`/estudiantes/${studentId}`}>{student.name}</Link>
                  <p className="text-sm text-muted">{relationship}</p>
                </div>
                {directory.payers[studentId] === guardian.id && <span className="status status-active">Responsable de pago</span>}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export default function Guardians({ directory, students, canManage }: { directory: GuardianDirectory; students: Student[]; canManage: boolean }) {
  return (
    <Routes>
      <Route index element={<GuardianList guardians={directory.guardians} canManage={canManage} />} />
      <Route path="nuevo" element={canManage ? <NewGuardian directory={directory} /> : <Navigate to="/acudientes" replace />} />
      <Route path=":id" element={<GuardianDetails directory={directory} students={students} />} />
      <Route path="*" element={<><BackToGuardians /><Heading title="Página de acudientes no encontrada" /></>} />
    </Routes>
  )
}
