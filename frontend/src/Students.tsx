import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { StudentGuardians } from './Guardians'
import type { GuardianDirectory } from './Guardians'
import { StudentEnrollments } from './Enrollments'
import type { Enrollment } from './Enrollments'
import { grades } from './AcademicSettings'
import type { SchoolYear } from './AcademicSettings'

export type Student = { id: string; name: string; code: string; archived: boolean; grade?: string; year?: number }

const pageSize = 8

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es-CO')
}

function Heading({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} | SIGE`
  }, [title])

  return <h1 tabIndex={-1} className="text-3xl font-semibold tracking-tight">{title}</h1>
}

function StudentList({ students, academicAccess }: { students: Student[]; academicAccess: boolean }) {
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  const query = params.get('q') ?? ''
  const requestedStatus = params.get('estado')
  const status = requestedStatus === 'todos' || requestedStatus === 'archivados' ? requestedStatus : 'activos'
  const term = normalize(query.trim())
  const matches = students.filter((student) => {
    const matchesStatus = status === 'todos' || student.archived === (status === 'archivados')
    return matchesStatus && (normalize(student.name).includes(term) || normalize(student.code).includes(term))
  })
  const pages = Math.max(1, Math.ceil(matches.length / pageSize))
  const requested = Number(params.get('pagina'))
  const page = Number.isSafeInteger(requested) ? Math.min(Math.max(requested, 1), pages) : 1
  const pageIndicator = useRef<HTMLSpanElement>(null)

  function changeFilter(key: 'q' | 'estado', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('pagina')
    setParams(next, { replace: true })
  }

  function pageLink(target: number) {
    const next = new URLSearchParams(params)
    if (target === 1) next.delete('pagina')
    else next.set('pagina', String(target))
    return { search: next.toString() }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Heading title="Estudiantes" />
        {academicAccess && <Link className="button button-primary inline-flex items-center" to={{ pathname: '/estudiantes/nuevo', search }}>Nuevo estudiante</Link>}
      </div>
      <section className="panel mt-6" aria-label="Listado de estudiantes">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div>
            <label className="field-label" htmlFor="student-search">Buscar estudiante</label>
            <input className="field" id="student-search" type="search" placeholder="Nombre o código" value={query} onChange={(event) => changeFilter('q', event.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="student-status">Estado</label>
            <select className="field" id="student-status" value={status} onChange={(event) => changeFilter('estado', event.target.value)}>
              <option value="activos">Activos</option>
              <option value="archivados">Archivados</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted" role="status">{matches.length ? `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}` : 'No hay estudiantes que coincidan con la búsqueda y el estado.'}</p>
        {matches.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border border-line">
            <table className="student-table">
              <caption className="sr-only">Estudiantes por nombre, código y estado</caption>
              <thead><tr><th scope="col">Estudiante</th><th scope="col">Código</th><th scope="col">Estado</th></tr></thead>
              <tbody>
                {matches.slice((page - 1) * pageSize, page * pageSize).map((student) => (
                  <tr key={student.id}>
                    <th scope="row">
                      <Link className="text-brand-green underline underline-offset-4" to={{ pathname: `/estudiantes/${student.id}`, search }}>{student.name}</Link>
                    </th>
                    <td className="[overflow-wrap:anywhere]">{student.code}</td>
                    <td><StudentStatus archived={student.archived} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav className="mt-4 flex flex-wrap items-center gap-3 text-sm" aria-label="Paginación de estudiantes">
            {page > 1 && <Link className="button button-secondary inline-flex items-center" onClick={() => pageIndicator.current?.focus()} to={pageLink(page - 1)}>Anterior</Link>}
            <span ref={pageIndicator} tabIndex={-1} role="status">Página {page} de {pages}</span>
            {page < pages && <Link className="button button-secondary inline-flex items-center" onClick={() => pageIndicator.current?.focus()} to={pageLink(page + 1)}>Siguiente</Link>}
          </nav>
        )}
      </section>
    </div>
  )
}

function StudentStatus({ archived }: { archived: boolean }) {
  return <span className={archived ? 'status status-pending' : 'status status-active'}>{archived ? 'Archivado' : 'Activo'}</span>
}

function BackToStudents() {
  const { search } = useLocation()
  if (new URLSearchParams(search).get('desde') === 'matricula') {
    return <Link className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green underline underline-offset-4" to="/matriculas/nueva">Volver a nueva matrícula</Link>
  }
  return <Link className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green underline underline-offset-4" to={{ pathname: '/estudiantes', search }}>Volver al listado</Link>
}

function StudentDetails({ student, directory, enrollments, academicAccess, treasuryAccess, onArchive }: {
  student: Student
  directory: GuardianDirectory
  enrollments: Enrollment[]
  academicAccess: boolean
  treasuryAccess: boolean
  onArchive: () => void
}) {
  const { search, state } = useLocation()
  const [confirm, setConfirm] = useState(false)
  const [archivedNow, setArchivedNow] = useState(false)
  const archiveButton = useRef<HTMLButtonElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const archiveStatus = useRef<HTMLDivElement>(null)
  const message = archivedNow ? 'Estudiante archivado. Puedes encontrar su ficha con el filtro Archivados.' : state?.message

  useEffect(() => {
    if (confirm) cancelButton.current?.focus()
    if (archivedNow) archiveStatus.current?.focus()
  }, [confirm, archivedNow])

  return (
    <div className="max-w-3xl">
      <BackToStudents />
      <Heading title={student.name} />
      <div ref={archiveStatus} role="status" tabIndex={-1}>{message && <p className="notice mt-4">{message}</p>}</div>
      <section className="panel mt-5" aria-label="Datos del estudiante">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-muted">Código de estudiante</dt><dd className="mt-1 break-all font-semibold">{student.code}</dd></div>
          <div><dt className="text-sm text-muted">Estado</dt><dd className="mt-1"><StudentStatus archived={student.archived} /></dd></div>
          <div><dt className="text-sm text-muted">Grado indicado</dt><dd className="mt-1">{student.grade ?? 'Sin asignar'}</dd></div>
          <div><dt className="text-sm text-muted">Año escolar indicado</dt><dd className="mt-1">{student.year ?? 'Sin asignar'}</dd></div>
        </dl>
        {academicAccess && !student.archived && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Link className="button button-primary inline-flex items-center" to={{ pathname: `/estudiantes/${student.id}/editar`, search }}>Editar ficha</Link>
            <button className="button button-secondary" ref={archiveButton} aria-expanded={confirm} type="button" onClick={() => setConfirm(!confirm)}>Archivar estudiante</button>
          </div>
        )}
        {confirm && (
          <section className="mt-4 rounded-lg border border-line bg-canvas p-4" aria-labelledby="archive-heading">
            <h2 id="archive-heading" className="font-semibold">¿Archivar a {student.name}?</h2>
            <p className="mt-1 text-sm text-muted">Su ficha seguirá disponible con el filtro Archivados.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="button button-secondary" ref={cancelButton} type="button" onClick={() => {
                setConfirm(false)
                archiveButton.current?.focus()
              }}>Cancelar</button>
              <button className="button button-primary" type="button" onClick={() => {
                onArchive()
                setConfirm(false)
                setArchivedNow(true)
              }}>Confirmar archivo</button>
            </div>
          </section>
        )}
      </section>
      <StudentGuardians student={student} directory={directory} canManage={academicAccess} />
      <StudentEnrollments student={student} enrollments={enrollments} canManage={academicAccess} />
      {treasuryAccess && <section className="panel mt-5" aria-labelledby="student-receivables">
        <h2 id="student-receivables" className="text-lg font-semibold">Cartera</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="button button-secondary inline-flex items-center" to={`/cartera?estudiante=${student.id}`}>Ver cargos y saldo</Link>
          {!student.archived && <Link className="button button-secondary inline-flex items-center" to={`/cobros/nuevo?estudiante=${student.id}`}>Nuevo cargo</Link>}
        </div>
      </section>}
    </div>
  )
}

function StudentForm({ student, students, years, onSave }: { student?: Student; students: Student[]; years: SchoolYear[]; onSave: (student: Student) => void }) {
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { search } = useLocation()
  const fromEnrollment = !student && new URLSearchParams(search).get('desde') === 'matricula'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name')).trim()
    if (!name) {
      setError('Escribe el nombre completo.')
      form.querySelector<HTMLInputElement>('#student-name')?.focus()
      return
    }

    const id = student?.id ?? crypto.randomUUID()
    const lastCode = students.reduce((largest, item) => {
      const match = /^EST-(\d+)$/.exec(item.code)
      return match ? Math.max(largest, Number(match[1])) : largest
    }, 0)
    const code = student?.code ?? `EST-${String(lastCode + 1).padStart(3, '0')}`
    const grade = grades.find((item) => item === data.get('grade'))
    const year = years.find((item) => String(item.year) === data.get('year'))?.year
    onSave({ id, name, code, grade, year, archived: student?.archived ?? false })
    if (fromEnrollment) {
      navigate(`/matriculas/nueva?estudiante=${id}`, { replace: true })
      return
    }
    navigate({ pathname: `/estudiantes/${id}`, search }, {
      replace: true,
      state: { message: student ? 'Ficha actualizada.' : 'Estudiante agregado.' },
    })
  }

  return (
    <div className="max-w-xl">
      <BackToStudents />
      <Heading title={student ? 'Editar estudiante' : 'Nuevo estudiante'} />
      <form className="panel mt-5 grid gap-4" noValidate onSubmit={submit}>
        <div>
          <label className="field-label" htmlFor="student-name">Nombre completo</label>
          <input className="field" id="student-name" name="name" required maxLength={100} defaultValue={student?.name} aria-invalid={!!error} aria-describedby={error ? 'student-name-error' : undefined} />
          {error && <p id="student-name-error" className="field-error" role="alert">{error}</p>}
        </div>
        <p className="text-sm text-muted">{student ? `Código de estudiante: ${student.code}` : 'El código del estudiante se asignará al guardar.'}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="student-grade">Grado (opcional)</label>
            <select className="field" id="student-grade" name="grade" defaultValue={student?.grade ?? ''}>
              <option value="">Sin asignar</option>
              {grades.map((grade) => <option key={grade}>{grade}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="student-year">Año escolar (opcional)</label>
            <select className="field" id="student-year" name="year" defaultValue={student?.year ?? ''}>
              <option value="">Sin asignar</option>
              {years.map(({ year }) => <option key={year}>{year}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="button button-primary" type="submit">{student ? 'Guardar cambios' : 'Agregar estudiante'}</button>
          <Link className="button button-secondary inline-flex items-center" to={fromEnrollment
            ? '/matriculas/nueva'
            : { pathname: student ? `/estudiantes/${student.id}` : '/estudiantes', search }
          }>Cancelar</Link>
        </div>
      </form>
    </div>
  )
}

type StudentsProps = {
  students: Student[]
  years: SchoolYear[]
  directory: GuardianDirectory
  enrollments: Enrollment[]
  academicAccess: boolean
  treasuryAccess: boolean
  onSave: (student: Student) => void
}

function StudentRecord({ students, years, directory, enrollments, academicAccess, treasuryAccess, editing, onSave }: StudentsProps & { editing?: boolean }) {
  const { id } = useParams()
  const { search } = useLocation()
  const student = students.find((item) => item.id === id)

  if (!student) return <><BackToStudents /><Heading title="Estudiante no encontrado" /></>
  if (editing) return academicAccess && !student.archived
    ? <StudentForm key={id} student={student} students={students} years={years} onSave={onSave} />
    : <Navigate to={{ pathname: `/estudiantes/${id}`, search }} replace />
  return <StudentDetails key={id} student={student} directory={directory} enrollments={enrollments}
    academicAccess={academicAccess} treasuryAccess={treasuryAccess} onArchive={() => onSave({ ...student, archived: true })} />
}

export default function Students(props: StudentsProps) {
  const { students, years, onSave, academicAccess } = props
  return (
    <Routes>
      <Route index element={<StudentList students={students} academicAccess={academicAccess} />} />
      <Route path="nuevo" element={academicAccess ? <StudentForm students={students} years={years} onSave={onSave} /> : <Navigate to="/estudiantes" replace />} />
      <Route path=":id" element={<StudentRecord {...props} />} />
      <Route path=":id/editar" element={<StudentRecord {...props} editing />} />
      <Route path="*" element={<><BackToStudents /><Heading title="Página de estudiantes no encontrada" /></>} />
    </Routes>
  )
}
