import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export type SchoolYear = { year: number; start: string; end: string }
export type SchoolGroup = { year: number; grade: string; name: string }

export const grades = [
  'Prejardín', 'Jardín', 'Transición', 'Primero', 'Segundo', 'Tercero', 'Cuarto',
  'Quinto', 'Sexto', 'Séptimo', 'Octavo', 'Noveno', 'Décimo', 'Undécimo',
]

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' })

export function SchoolYears({ years, onAdd }: { years: SchoolYear[]; onAdd: (year: SchoolYear) => void }) {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function addYear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const year = Number(fields.get('year'))
    const start = String(fields.get('start'))
    const end = String(fields.get('end'))
    setMessage('')

    if (years.some((item) => item.year === year)) {
      setError(`El año escolar ${year} ya existe.`)
      return
    }
    if (start >= end) {
      setError('La fecha de finalización debe ser posterior a la de inicio.')
      return
    }

    onAdd({ year, start, end })
    form.reset()
    setError('')
    setMessage(`Año escolar ${year} agregado.`)
  }

  return (
    <div className="mt-6 grid max-w-5xl items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="panel" aria-labelledby="years-heading">
        <h2 id="years-heading" className="text-lg font-semibold">Años escolares</h2>
        {years.length === 0 && <p className="mt-2 text-sm text-muted">Todavía no hay años escolares registrados.</p>}
        <ul className="mt-2 divide-y divide-line">
          {years.map(({ year, start, end }) => (
            <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3" key={year}>
              <div>
                <p className="font-semibold">{year}</p>
                <p className="text-sm text-muted">
                  <time dateTime={start}>{dateFormat.format(new Date(start))}</time>
                  {' al '}
                  <time dateTime={end}>{dateFormat.format(new Date(end))}</time>
                </p>
              </div>
              <Link className="flex min-h-11 items-center text-sm font-semibold text-brand-green underline underline-offset-4" to={`/grados-y-grupos?anio=${year}`}>
                Ver grupos de {year}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel" aria-labelledby="add-year-heading">
        <h2 id="add-year-heading" className="text-lg font-semibold">Agregar año escolar</h2>
        <form className="mt-4 grid gap-4" onSubmit={addYear}>
          <div>
            <label className="field-label" htmlFor="school-year">Año</label>
            <input className="field" id="school-year" name="year" type="number" min="1900" max="9999" placeholder="Ej. 2028" required />
          </div>
          <div>
            <label className="field-label" htmlFor="year-start">Fecha de inicio</label>
            <input className="field" id="year-start" name="start" type="date" min="1900-01-01" max="9999-12-31" required />
          </div>
          <div>
            <label className="field-label" htmlFor="year-end">Fecha de finalización</label>
            <input className="field" id="year-end" name="end" type="date" min="1900-01-01" max="9999-12-31" required />
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="button button-primary w-fit" type="submit">Agregar año</button>
        </form>
        <div role="status">{message && <p className="notice mt-4">{message}</p>}</div>
      </section>
    </div>
  )
}

export function GradesAndGroups({
  years, groups, onAdd,
}: { years: SchoolYear[]; groups: SchoolGroup[]; onAdd: (group: SchoolGroup) => void }) {
  const [params, setParams] = useSearchParams()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const year = years.find((item) => String(item.year) === params.get('anio'))?.year ?? years[0]?.year
  const grade = grades.find((item) => item === params.get('grado')) ?? ''
  const visibleGroups = groups.filter((item) => item.year === year && (!grade || item.grade === grade))

  function setFilter(key: 'anio' | 'grado', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
    setError('')
    setMessage('')
  }

  function addGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (year === undefined) return
    const form = event.currentTarget
    const name = String(new FormData(form).get('name')).trim()
    setMessage('')

    if (!name) {
      setError('Escribe el nombre del grupo.')
      return
    }
    if (visibleGroups.some((item) => item.name.toLocaleLowerCase('es-CO') === name.toLocaleLowerCase('es-CO'))) {
      setError('Ya existe un grupo con ese nombre para este año y grado.')
      return
    }

    onAdd({ year, grade, name })
    form.reset()
    setError('')
    setMessage(`Grupo ${name} agregado.`)
  }

  if (year === undefined) {
    return <p className="panel mt-5 max-w-xl">Para agregar grupos, <Link className="text-brand-green underline" to="/anos-escolares">crea primero un año escolar</Link>.</p>
  }

  return (
    <div className="mt-6 grid max-w-5xl items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="panel" aria-labelledby="groups-heading">
        <h2 id="groups-heading" className="text-lg font-semibold">Grupos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="group-year">Año escolar</label>
            <select className="field" id="group-year" value={year} onChange={(event) => setFilter('anio', event.target.value)}>
              {years.map((item) => <option key={item.year} value={item.year}>{item.year}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="group-grade">Grado</label>
            <select className="field" id="group-grade" value={grade} onChange={(event) => setFilter('grado', event.target.value)}>
              <option value="">Todos los grados</option>
              {grades.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted" role="status">
          {visibleGroups.length === 0 ? 'No hay grupos para esta selección.' : `${visibleGroups.length} ${visibleGroups.length === 1 ? 'grupo' : 'grupos'}`}
        </p>
        {visibleGroups.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border border-line">
            <table className="student-table">
              <caption className="sr-only">Grupos para el año escolar {year}</caption>
              <thead><tr><th scope="col">Grupo</th><th scope="col">Grado</th></tr></thead>
              <tbody>
                {visibleGroups.map((item) => (
                  <tr key={JSON.stringify([item.grade, item.name])}>
                    <th scope="row">{item.name}</th><td>{item.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel" aria-labelledby="add-group-heading">
        <h2 id="add-group-heading" className="text-lg font-semibold">Agregar grupo</h2>
        {grade ? (
          <>
            <p className="mt-2 text-sm text-muted">{grade} · {year}</p>
            <form className="mt-4 grid gap-4" key={JSON.stringify([year, grade])} onSubmit={addGroup}>
              <div>
                <label className="field-label" htmlFor="group-name">Nombre del grupo</label>
                <input className="field" id="group-name" name="name" placeholder="Ej. 5A" maxLength={48} required />
              </div>
              {error && <p className="field-error" role="alert">{error}</p>}
              <button className="button button-primary w-fit" type="submit">Agregar grupo</button>
            </form>
            <div role="status">{message && <p className="notice mt-4">{message}</p>}</div>
          </>
        ) : <p className="mt-2 text-sm text-muted">Selecciona un grado para agregar un grupo en {year}.</p>}
      </section>
    </div>
  )
}
