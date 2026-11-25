import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Route, Routes, useSearchParams } from 'react-router-dom'
import type { SchoolGroup, SchoolYear } from './AcademicSettings'
import type { GuardianDirectory } from './Guardians'
import type { Student } from './Students'

export type Enrollment = SchoolGroup & { studentId: string }

type EnrollmentProps = {
  students: Student[]
  years: SchoolYear[]
  groups: SchoolGroup[]
  directory: GuardianDirectory
  enrollments: Enrollment[]
  onEnroll: (enrollment: Enrollment) => void
}

function Heading({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} | SIGE`
  }, [title])
  return <h1 tabIndex={-1} className="text-3xl font-semibold tracking-tight">{title}</h1>
}

export function StudentEnrollments({ student, enrollments, canManage }: { student: Student; enrollments: Enrollment[]; canManage: boolean }) {
  const history = enrollments.filter((item) => item.studentId === student.id).sort((a, b) => b.year - a.year)
  return (
    <section className="panel mt-5" aria-labelledby="student-enrollment-history">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="student-enrollment-history" className="text-lg font-semibold">Historial de matrículas</h2>
        {canManage && !student.archived && (
          <Link className="button button-secondary inline-flex items-center" to={`/matriculas/nueva?estudiante=${student.id}`}>Nueva matrícula</Link>
        )}
      </div>
      {history.length === 0 ? <p className="mt-2 text-sm text-muted">Este estudiante aún no tiene matrículas.</p> : (
        <ul className="mt-2 divide-y divide-line">
          {history.map(({ year, grade, name }) => (
            <li className="py-2 [overflow-wrap:anywhere]" key={year}>
              <span className="font-semibold">{year}</span> · {grade} · {name}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function EnrollmentList({ students, years, enrollments }: Pick<EnrollmentProps, 'students' | 'years' | 'enrollments'>) {
  const [params, setParams] = useSearchParams()
  const year = params.get('anio') ?? ''
  const visible = enrollments.filter((item) => !year || String(item.year) === year)

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading title="Matrículas" />
        <Link className="button button-primary inline-flex items-center" to="/matriculas/nueva">Nueva matrícula</Link>
      </div>
      <section className="panel mt-5" aria-label="Listado de matrículas">
        <label className="field-label" htmlFor="enrollment-filter-year">Año escolar</label>
        <select className="field max-w-xs" id="enrollment-filter-year" value={year} onChange={(event) => {
          const value = event.target.value
          setParams(value ? { anio: value } : {}, { replace: true })
        }}>
          <option value="">Todos los años</option>
          {years.map(({ year }) => <option key={year}>{year}</option>)}
        </select>
        {visible.length === 0 ? <p className="mt-4 text-sm text-muted" role="status">No hay matrículas para este año.</p> : (
          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <table className="student-table">
              <caption className="sr-only">Matrículas por estudiante, año y grupo</caption>
              <thead><tr><th scope="col">Estudiante</th><th scope="col">Año</th><th scope="col">Grado y grupo</th></tr></thead>
              <tbody>
                {visible.map(({ studentId, year, grade, name }) => {
                  const student = students.find((item) => item.id === studentId)
                  return (
                    <tr key={`${studentId}-${year}`}>
                      <th scope="row"><Link className="text-brand-green underline underline-offset-4" to={`/estudiantes/${studentId}`}>{student?.name ?? 'Estudiante'}</Link></th>
                      <td>{year}</td>
                      <td className="[overflow-wrap:anywhere]">{grade} · {name}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function EnrollmentForm({ students, years, groups, directory, enrollments, onEnroll }: EnrollmentProps) {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('')
  const [grade, setGrade] = useState('')
  const [group, setGroup] = useState('')
  const [review, setReview] = useState<Enrollment | null>(null)
  const [completed, setCompleted] = useState(false)
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const student = students.find((item) => item.id === params.get('estudiante') && !item.archived)
  const hasGuardian = directory.links.some((item) => item.studentId === student?.id)
  const existing = enrollments.find((item) => item.studentId === student?.id && String(item.year) === year)
  const gradeOptions = [...new Set(groups.filter((item) => String(item.year) === year).map((item) => item.grade))]
  const groupOptions = groups.filter((item) => String(item.year) === year && item.grade === grade)
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es-CO')
  const matches = students.filter((item) => !item.archived && normalize(`${item.name} ${item.code}`).includes(normalize(query.trim())))

  useEffect(() => {
    if (review) stepHeading.current?.focus()
  }, [review, completed])

  function chooseStudent(id: string) {
    setReview(null)
    setCompleted(false)
    setYear('')
    setGrade('')
    setGroup('')
    setParams(id ? { estudiante: id } : {}, { replace: true })
  }

  function showReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const selectedGroup = groupOptions.find((item) => item.name === group)
    if (student && hasGuardian && selectedGroup && !existing) {
      setReview({ ...selectedGroup, studentId: student.id })
    }
  }

  return (
    <div className="max-w-3xl">
      <Link className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green underline underline-offset-4" to="/matriculas">Volver a Matrículas</Link>
      <Heading title="Nueva matrícula" />
      <section className="panel mt-5">
        {review && student ? (
          <>
            <h2 ref={stepHeading} tabIndex={-1} className="text-lg font-semibold">{completed ? 'Matrícula registrada' : 'Revisa la matrícula'}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 [overflow-wrap:anywhere]">
              <div><dt className="text-sm text-muted">Estudiante</dt><dd className="font-semibold">{student.name}</dd></div>
              <div><dt className="text-sm text-muted">Año escolar</dt><dd className="font-semibold">{review.year}</dd></div>
              <div><dt className="text-sm text-muted">Grado</dt><dd className="font-semibold">{review.grade}</dd></div>
              <div><dt className="text-sm text-muted">Grupo</dt><dd className="font-semibold">{review.name}</dd></div>
            </dl>
            {completed ? (
              <Link className="button button-primary mt-5 inline-flex items-center" to={`/estudiantes/${student.id}`}>Ver ficha e historial</Link>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                <button className="button button-secondary" type="button" onClick={() => setReview(null)}>Editar selección</button>
                <button className="button button-primary" type="button" onClick={() => {
                  onEnroll(review)
                  setCompleted(true)
                }}>Confirmar matrícula</button>
              </div>
            )}
          </>
        ) : !student ? (
          <>
            <h2 className="text-lg font-semibold">Selecciona al estudiante</h2>
            <label className="field-label mt-4" htmlFor="enrollment-student">Buscar por nombre o código</label>
            <input className="field" id="enrollment-student" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
            {matches.length === 0 && <p className="mt-3 text-sm text-muted" role="status">No se encontraron estudiantes activos.</p>}
            {matches.length > 8 && <p className="mt-3 text-sm text-muted">Se muestran 8 de {matches.length}. Escribe para acotar la búsqueda.</p>}
            <ul className="mt-2 divide-y divide-line">
              {matches.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <button className="flex min-h-11 w-full cursor-pointer flex-wrap items-center justify-between gap-2 rounded-sm px-2 py-2 text-left hover:bg-canvas" type="button" onClick={() => chooseStudent(item.id)}>
                    <span className="font-semibold text-brand-green [overflow-wrap:anywhere]">{item.name}</span>
                    <span className="text-sm text-muted [overflow-wrap:anywhere]">{item.code}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Link className="button button-secondary mt-4 inline-flex items-center" to="/estudiantes/nuevo?desde=matricula">Crear estudiante</Link>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{student.name}</h2>
              <button className="button button-secondary" type="button" onClick={() => chooseStudent('')}>Cambiar estudiante</button>
            </div>
            {!hasGuardian ? (
              <div className="mt-4">
                <p className="text-sm text-muted">Vincula un acudiente desde la ficha para continuar con la matrícula.</p>
                <Link className="button button-primary mt-3 inline-flex items-center" to={`/estudiantes/${student.id}#student-guardians`}>Ir a la ficha del estudiante</Link>
              </div>
            ) : years.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                <Link className="text-brand-green underline" to="/anos-escolares">Crea un año escolar</Link> y configura sus grupos para continuar.
              </p>
            ) : (
              <form className="mt-4 grid gap-4" onSubmit={showReview}>
                <div>
                  <label className="field-label" htmlFor="enrollment-year">Año escolar</label>
                  <select className="field" id="enrollment-year" value={year} required onChange={(event) => {
                    setYear(event.target.value)
                    setGrade('')
                    setGroup('')
                  }}>
                    <option value="">Selecciona un año</option>
                    {years.map((item) => <option key={item.year}>{item.year}</option>)}
                  </select>
                </div>
                {existing ? (
                  <p className="field-error" role="status">Este estudiante ya tiene matrícula en {existing.year} ({existing.grade} · {existing.name}). Selecciona otro año.</p>
                ) : year && gradeOptions.length === 0 ? (
                  <p className="text-sm text-muted">No hay grupos configurados para este año. <Link className="text-brand-green underline underline-offset-4" to={`/grados-y-grupos?anio=${year}`}>Ver Grados y grupos</Link>.</p>
                ) : year && (
                  <>
                    <div>
                      <label className="field-label" htmlFor="enrollment-grade">Grado</label>
                      <select className="field" id="enrollment-grade" required value={grade} onChange={(event) => {
                        setGrade(event.target.value)
                        setGroup('')
                      }}>
                        <option value="">Selecciona un grado</option>
                        {gradeOptions.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="field-label" htmlFor="enrollment-group">Grupo</label>
                      <select className="field" id="enrollment-group" required disabled={!grade} value={group} onChange={(event) => setGroup(event.target.value)}>
                        <option value="">Selecciona un grupo</option>
                        {groupOptions.map((item) => <option key={item.name}>{item.name}</option>)}
                      </select>
                    </div>
                    <button className="button button-primary w-fit" type="submit">Revisar matrícula</button>
                  </>
                )}
              </form>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default function Enrollments(props: EnrollmentProps) {
  return (
    <Routes>
      <Route index element={<EnrollmentList {...props} />} />
      <Route path="nueva" element={<EnrollmentForm {...props} />} />
      <Route path="*" element={<><Heading title="Página de matrículas no encontrada" /><Link className="button button-primary mt-4 inline-flex items-center" to="/matriculas">Volver a Matrículas</Link></>} />
    </Routes>
  )
}
