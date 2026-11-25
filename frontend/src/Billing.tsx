import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Student } from './Students'
import type { RecordOperation } from './Administration'

type Concept = { id: string; name: string; amount: number; start: string; end: string }
type Charge = { id: string; studentId: string; concept: string; amount: number; due: string }

export type Payment = {
  id: string
  number: number
  chargeId: string
  studentName: string
  studentCode: string
  amount: number
  balanceAfter: number
  date: string
  method: string
  reference: string
  reversed?: { date: string; reason: string }
}

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const calendar = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' })
const bogota = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', dateStyle: 'short' })
export const formatDate = (date: string) => calendar.format(new Date(date))
export const today = () => bogota.format(new Date())
export const formatAmount = (amount: number) => `${money.format(amount)} COP`
const maxAmount = 999_999_999

export function useBilling(record: RecordOperation) {
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  function balance(charge: Charge, records = payments) {
    return records.reduce((amount, item) => item.chargeId === charge.id && !item.reversed ? amount - item.amount : amount, charge.amount)
  }

  function addPayment(data: Omit<Payment, 'number' | 'balanceAfter' | 'reversed'>) {
    const charge = charges.find((item) => item.id === data.chargeId)
    if (!charge || !Number.isSafeInteger(data.amount) || data.amount < 1 || data.amount > balance(charge) || payments.some((item) => item.id === data.id)) return false

    setPayments((current) => {
      const remaining = balance(charge, current)
      if (data.amount > remaining || current.some((item) => item.id === data.id)) return current
      return [{ ...data, number: current.length + 1, balanceAfter: remaining - data.amount }, ...current]
    })
    record('Registró pago', `${charge.concept} · ${data.studentCode} · ${formatAmount(data.amount)}`)
    return true
  }

  function reversePayment(id: string, reason: string) {
    const payment = payments.find((item) => item.id === id && !item.reversed)
    if (!payment) return
    const date = today()
    setPayments((current) => current.map((item) => item.id === id && !item.reversed
      ? { ...item, reversed: { date, reason } }
      : item))
    record('Reversó pago', `${payment.studentCode} · ${formatAmount(payment.amount)}`)
  }

  function addConcept(data: Omit<Concept, 'id'>) {
    const id = crypto.randomUUID()
    setConcepts((current) => [...current, { ...data, id }])
    record('Creó concepto de cobro', data.name)
  }

  function addCharge(data: Omit<Charge, 'id'>) {
    const id = crypto.randomUUID()
    setCharges((current) => [{ ...data, id }, ...current])
    record('Generó cargo', `${data.concept} · ${formatAmount(data.amount)}`)
    return id
  }

  return { concepts, charges, payments, balance, addConcept, addCharge, addPayment, reversePayment }
}

type BillingData = ReturnType<typeof useBilling>
export type BillingProps = { billing: BillingData; students: Student[] }

function Heading({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} | SIGE`
  }, [title])
  return <h1 tabIndex={-1} className="text-3xl font-semibold tracking-tight">{title}</h1>
}

function Field({ id, label, type = 'text', required = true }: { id: string; label: string; type?: 'text' | 'number' | 'date'; required?: boolean }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <input className="field" id={id} name={id} type={type} required={required}
        min={type === 'date' ? '1900-01-01' : type === 'number' ? 1 : undefined}
        max={type === 'date' ? '9999-12-31' : type === 'number' ? maxAmount : undefined}
        maxLength={type === 'text' ? 80 : undefined} />
    </div>
  )
}

function ChargeForm({ billing, students }: BillingProps) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const active = students.filter((student) => !student.archived)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const studentId = String(fields.get('charge-student'))
    const concept = billing.concepts.find((item) => item.id === fields.get('charge-concept'))
    const due = String(fields.get('charge-due'))
    if (!concept || !active.some((item) => item.id === studentId)) return
    if (due < concept.start || (concept.end && due > concept.end)) {
      setError('El vencimiento debe quedar dentro de la vigencia del concepto.')
      return
    }
    const id = billing.addCharge({ studentId, concept: concept.name, amount: concept.amount, due })
    navigate(`/cartera/${id}`, { replace: true, state: { created: true } })
  }

  const preselected = active.find((student) => student.id === params.get('estudiante'))?.id ?? ''

  return (
    <div className="max-w-xl">
      <Link className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green underline" to="/cobros">Volver a Cobros</Link>
      <Heading title="Nuevo cargo" />
      {active.length === 0 || billing.concepts.length === 0 ? (
        <div className="panel mt-5 grid gap-2 text-sm text-muted">
          {active.length === 0 && <p>Para generar un cargo necesitas un <Link className="text-brand-green underline" to="/estudiantes">estudiante activo</Link>.</p>}
          {billing.concepts.length === 0 && <p><Link className="text-brand-green underline" to="/cobros">Agrega un concepto de cobro</Link> para seleccionar su importe.</p>}
        </div>
      ) : <form className="panel mt-5 grid gap-4" onSubmit={submit}>
        <div>
          <label className="field-label" htmlFor="charge-student">Estudiante</label>
          <select className="field" id="charge-student" name="charge-student" defaultValue={preselected} required>
            <option value="">Selecciona un estudiante</option>
            {active.map(({ id, name, code }) => <option key={id} value={id}>{name} · {code}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="charge-concept">Concepto e importe</label>
          <select className="field" id="charge-concept" name="charge-concept" defaultValue="" required>
            <option value="">Selecciona un concepto</option>
            {billing.concepts.map(({ id, name, amount }) => <option key={id} value={id}>{name} · {formatAmount(amount)}</option>)}
          </select>
        </div>
        <Field id="charge-due" label="Fecha de vencimiento" type="date" />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="button button-primary w-fit" type="submit">Generar cargo</button>
      </form>}
    </div>
  )
}

function ConceptList({ billing }: { billing: BillingData }) {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const name = String(fields.get('concept-name')).trim()
    const amount = Number(fields.get('concept-amount'))
    const start = String(fields.get('concept-start'))
    const end = String(fields.get('concept-end'))
    setMessage('')
    if (!name) {
      setError('Escribe el nombre del concepto.')
      return
    }
    if (end && end < start) {
      setError('La fecha final debe ser igual o posterior a la inicial.')
      return
    }
    if (billing.concepts.some((item) => item.name.toLocaleLowerCase('es-CO') === name.toLocaleLowerCase('es-CO'))) {
      setError('Ya existe un concepto con ese nombre.')
      return
    }
    billing.addConcept({ name, amount, start, end })
    form.reset()
    setError('')
    setMessage('Concepto agregado.')
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading title="Cobros" />
        <Link className="button button-primary inline-flex items-center" to="/cobros/nuevo">Nuevo cargo</Link>
      </div>
      <p className="mt-2 text-sm text-muted">Configura conceptos y genera cargos para estudiantes.</p>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
        <section className="panel" aria-labelledby="concept-list">
          <h2 id="concept-list" className="text-lg font-semibold">Conceptos de cobro</h2>
          {billing.concepts.length === 0 && <p className="mt-2 text-sm text-muted">Todavía no hay conceptos registrados.</p>}
          <ul className="mt-2 divide-y divide-line">
            {billing.concepts.map(({ id, name, amount, start, end }) => (
              <li className="py-3 [overflow-wrap:anywhere]" key={id}>
                <p className="font-semibold">{name} · {formatAmount(amount)}</p>
                <p className="mt-1 text-sm text-muted">Desde {formatDate(start)}{end && ` hasta ${formatDate(end)}`}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel" aria-labelledby="add-concept">
          <h2 id="add-concept" className="text-lg font-semibold">Agregar concepto</h2>
          <form className="mt-4 grid gap-4" onSubmit={submit}>
            <Field id="concept-name" label="Nombre" />
            <Field id="concept-amount" label="Importe en pesos colombianos" type="number" />
            <Field id="concept-start" label="Inicio de vigencia" type="date" />
            <Field id="concept-end" label="Fin de vigencia (opcional)" type="date" required={false} />
            {error && <p className="field-error" role="alert">{error}</p>}
            <button className="button button-primary w-fit" type="submit">Agregar concepto</button>
          </form>
          <div role="status">{message && <p className="notice mt-4">{message}</p>}</div>
        </section>
      </div>
    </div>
  )
}

function chargeStatus(charge: Charge, balance: number) {
  if (balance === 0) return 'pagado'
  return charge.due < today() ? 'vencido' : 'pendiente'
}

function ChargeStatus({ charge, balance }: { charge: Charge; balance: number }) {
  const status = chargeStatus(charge, balance)
  if (status === 'pagado') return <span className="status status-active">Pagado</span>
  if (status === 'vencido') return <span className="status bg-red-50 text-danger">Vencido</span>
  return <span className="status status-pending">Pendiente</span>
}

function ReceivablesList({ billing, students }: BillingProps) {
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  const studentId = params.get('estudiante') ?? ''
  const due = params.get('hasta') ?? ''
  const status = params.get('estado') ?? ''
  const visible = billing.charges.filter((item) => (!studentId || item.studentId === studentId)
    && (!due || item.due <= due)
    && (!status || chargeStatus(item, billing.balance(item)) === status))

  function filter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="max-w-5xl">
      <Heading title="Cartera" />
      <p className="mt-2 text-sm text-muted">Consulta el saldo de los cargos y su vencimiento.</p>
      <section className="panel mt-5" aria-label="Obligaciones">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="receivable-student">Estudiante</label>
            <select className="field" id="receivable-student" value={studentId} onChange={(event) => filter('estudiante', event.target.value)}>
              <option value="">Todos los estudiantes</option>
              {students.map(({ id, name, code }) => <option key={id} value={id}>{name} · {code}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="receivable-due">Vence hasta</label>
            <input className="field" id="receivable-due" type="date" value={due} onChange={(event) => filter('hasta', event.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="receivable-status">Estado</label>
            <select className="field" id="receivable-status" value={status} onChange={(event) => filter('estado', event.target.value)}>
              <option value="">Todos los estados</option><option value="pendiente">Pendiente</option><option value="vencido">Vencido</option><option value="pagado">Pagado</option>
            </select>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted" role="status">
          {visible.length ? `Saldo de los cargos mostrados: ${formatAmount(visible.reduce((sum, item) => sum + billing.balance(item), 0))}` : 'No hay cargos para estos filtros.'}
        </p>
        <ul className="mt-2 divide-y divide-line">
          {visible.map((item) => (
            <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={item.id}>
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <Link className="font-semibold text-brand-green underline underline-offset-4" to={{ pathname: `/cartera/${item.id}`, search }}>
                  {item.concept} · {students.find((student) => student.id === item.studentId)?.name ?? 'Estudiante'}
                </Link>
                <p className="mt-1 text-sm text-muted">Vence el {formatDate(item.due)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{formatAmount(billing.balance(item))}</span><ChargeStatus charge={item} balance={billing.balance(item)} /></div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ChargeDetail({ billing, students }: BillingProps) {
  const { id } = useParams()
  const { search, state } = useLocation()
  const charge = billing.charges.find((item) => item.id === id)
  const student = students.find((item) => item.id === charge?.studentId)
  const balance = charge ? billing.balance(charge) : 0

  return (
    <div className="max-w-3xl">
      <Link className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green underline" to={{ pathname: '/cartera', search }}>Volver a Cartera</Link>
      <Heading title={charge?.concept ?? 'Cargo no encontrado'} />
      {charge && (
        <>
          {state?.created && <p className="notice mt-4" role="status">Cargo registrado.</p>}
          <dl className="panel mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-sm text-muted">Estudiante</dt><dd>{student ? <Link className="text-brand-green underline [overflow-wrap:anywhere]" to={`/estudiantes/${student.id}`}>{student.name}</Link> : 'Sin ficha'}</dd></div>
            <div><dt className="text-sm text-muted">Vencimiento</dt><dd>{formatDate(charge.due)}</dd></div>
            <div><dt className="text-sm text-muted">Importe del cargo</dt><dd>{formatAmount(charge.amount)}</dd></div>
            <div><dt className="text-sm text-muted">Saldo pendiente</dt><dd className="font-semibold">{formatAmount(balance)}</dd></div>
            <div><dt className="text-sm text-muted">Estado</dt><dd><ChargeStatus charge={charge} balance={balance} /></dd></div>
          </dl>
          {balance > 0 && <Link className="button button-primary mt-4 inline-flex items-center" to={`/pagos/nuevo?cargo=${charge.id}`}>Registrar pago</Link>}
          {billing.payments.some((item) => item.chargeId === charge.id) && (
            <Link className="button button-secondary mt-4 ml-2 inline-flex items-center" to={`/pagos?cargo=${charge.id}`}>Ver historial de pagos</Link>
          )}
        </>
      )}
    </div>
  )
}

export function Billing(props: BillingProps) {
  return <Routes><Route index element={<ConceptList billing={props.billing} />} /><Route path="nuevo" element={<ChargeForm {...props} />} /><Route path="*" element={<ChargeDetail {...props} />} /></Routes>
}

export function Receivables(props: BillingProps) {
  return <Routes><Route index element={<ReceivablesList {...props} />} /><Route path=":id" element={<ChargeDetail {...props} />} /><Route path="*" element={<ChargeDetail {...props} />} /></Routes>
}
