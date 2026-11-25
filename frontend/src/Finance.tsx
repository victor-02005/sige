import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatAmount, formatDate, today } from './Billing'
import type { Payment } from './Billing'
import type { RecordOperation } from './Administration'
import StatisticChart from './StatisticChart'

const kinds = ['Ingreso', 'Egreso', 'Transferencia'] as const
type Kind = typeof kinds[number]
type Movement = { id: string; kind: Kind; date: string; amount: number; detail: string; account: string }

export function useFinance(record: RecordOperation) {
  const [movements, setMovements] = useState<Movement[]>([])

  function addMovement(movement: Omit<Movement, 'id'>) {
    const id = crypto.randomUUID()
    setMovements((current) => [{ ...movement, id }, ...current])
    record('Registró movimiento financiero', `${movement.kind} · ${formatAmount(movement.amount)}`)
  }

  return { movements, addMovement }
}

type FinanceData = ReturnType<typeof useFinance>

function usePeriod() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('periodo') ?? ''
  const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : today().slice(0, 7)
  return { period, changePeriod: (value: string) => setParams({ periodo: value }, { replace: true }) }
}

export function financePeriod(movements: Movement[], payments: Payment[], period: string) {
  const received: Movement[] = payments.filter((item) => !item.reversed).map((item) => ({
    id: item.id,
    kind: 'Ingreso',
    date: item.date,
    amount: item.amount,
    detail: `Pago de ${item.studentName}`,
    account: item.method === 'Efectivo' ? 'Caja' : 'Banco',
  }))
  const visible = [...movements, ...received].filter((item) => item.date.startsWith(period)).sort((a, b) => b.date.localeCompare(a.date))
  const totals = { Ingreso: 0, Egreso: 0, Transferencia: 0 }
  for (const item of visible) totals[item.kind] += item.amount
  const collections = received.reduce((sum, item) => item.date.startsWith(period) ? sum + item.amount : sum, 0)
  return { visible, totals, collections }
}

function PeriodField({ period, onChange }: { period: string; onChange: (period: string) => void }) {
  return (
    <div>
      <label className="field-label" htmlFor="finance-period">Periodo</label>
      <input className="field max-w-56" type="month" id="finance-period" value={period} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function Totals({ totals, collections }: Pick<ReturnType<typeof financePeriod>, 'totals' | 'collections'>) {
  const metrics = [
    { label: 'Ingresos', value: totals.Ingreso, detail: `Incluyen ${formatAmount(collections)} en cobros recibidos` },
    { label: 'Egresos', value: totals.Egreso },
    { label: 'Transferencias internas', value: totals.Transferencia },
    { label: 'Flujo neto', value: totals.Ingreso - totals.Egreso, detail: 'Ingresos menos egresos' },
  ]
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, detail }) => (
        <div className="panel" key={label}>
          <dt className="text-sm font-semibold text-muted">{label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums [overflow-wrap:anywhere]">{formatAmount(value)}</dd>
          {detail && <dd className="mt-1 text-sm text-muted">{detail}</dd>}
        </div>
      ))}
    </dl>
  )
}

const monthLabel = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' })

function FinanceCharts({ finance, payments, period }: {
  finance: FinanceData
  payments: Payment[]
  period: string
}) {
  const monthly = [2, 1, 0].map((offset) => {
    const date = new Date(`${period}-01T00:00:00Z`)
    date.setUTCMonth(date.getUTCMonth() - offset)
    return { date, totals: financePeriod(finance.movements, payments, date.toISOString().slice(0, 7)).totals }
  })
  const labels = monthly.map(({ date }) => monthLabel.format(date))

  return (
    <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
      <StatisticChart title="Ingresos y egresos de los últimos tres meses" labels={labels} money series={[
        { label: 'Ingresos', points: monthly.map(({ totals }) => totals.Ingreso) },
        { label: 'Egresos', points: monthly.map(({ totals }) => totals.Egreso) },
      ]} />
      <StatisticChart title="Transferencias de los últimos tres meses" labels={labels} money series={[
        { label: 'Transferencias', points: monthly.map(({ totals }) => totals.Transferencia) },
      ]} />
    </div>
  )
}

export function FinanceSummary({ finance, payments }: { finance: FinanceData; payments: Payment[] }) {
  const { period, changePeriod } = usePeriod()
  const { totals, collections } = financePeriod(finance.movements, payments, period)
  return (
    <section className="mt-8" aria-labelledby="finance-summary-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 id="finance-summary-heading" className="text-lg font-semibold text-brand-ink">Resumen financiero</h2>
        <PeriodField period={period} onChange={changePeriod} />
      </div>
      <Totals totals={totals} collections={collections} />
      <Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green underline underline-offset-4" to={`/finanzas?periodo=${period}`}>Ver movimientos del periodo</Link>
      <FinanceCharts finance={finance} payments={payments} period={period} />
    </section>
  )
}

function MovementForm({ onAdd }: { onAdd: (movement: Omit<Movement, 'id'>) => void }) {
  const [kind, setKind] = useState<Kind>('Ingreso')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const detail = String(data.get('detail')).trim()
    const account = String(data.get('account'))
    const destination = String(data.get('destination') ?? '')
    setMessage('')
    if (!detail) {
      setError('Escribe una descripción del movimiento.')
      return
    }
    if (kind === 'Transferencia' && account === destination) {
      setError('Selecciona una cuenta de destino distinta de la cuenta de origen.')
      return
    }
    onAdd({ kind, detail, date: String(data.get('date')), amount: Number(data.get('amount')), account: destination ? `${account} → ${destination}` : account })
    form.reset()
    setKind('Ingreso')
    setError('')
    setMessage('Movimiento registrado.')
  }

  return (
    <section className="panel" aria-labelledby="movement-heading">
      <h2 id="movement-heading" className="text-lg font-semibold">Registrar movimiento</h2>
      <form className="mt-4 grid gap-4" onSubmit={submit}>
        <div>
          <label className="field-label" htmlFor="movement-kind">Tipo</label>
          <select className="field" id="movement-kind" value={kind} onChange={(event) => setKind(kinds[event.target.selectedIndex])}>
            {kinds.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="movement-detail">Descripción</label>
          <input className="field" id="movement-detail" name="detail" required maxLength={100} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="movement-amount">Importe (COP)</label>
            <input className="field" id="movement-amount" name="amount" type="number" min="1" max="999999999" step="1" required />
          </div>
          <div>
            <label className="field-label" htmlFor="movement-date">Fecha</label>
            <input className="field" id="movement-date" name="date" type="date" min="1900-01-01" max={today()} defaultValue={today()} required />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="movement-account">{kind === 'Transferencia' ? 'Cuenta de origen' : 'Cuenta'}</label>
          <select className="field" id="movement-account" name="account" required defaultValue="">
            <option value="">Selecciona una cuenta</option><option>Caja</option><option>Banco</option>
          </select>
        </div>
        {kind === 'Transferencia' && (
          <div>
            <label className="field-label" htmlFor="movement-destination">Cuenta de destino</label>
            <select className="field" id="movement-destination" name="destination" required defaultValue="">
              <option value="">Selecciona una cuenta</option><option>Caja</option><option>Banco</option>
            </select>
          </div>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="button button-primary w-fit" type="submit">Registrar movimiento</button>
      </form>
      <div role="status">{message && <p className="notice mt-4">{message}</p>}</div>
    </section>
  )
}

export default function Finance({ finance, payments }: { finance: FinanceData; payments: Payment[] }) {
  const { period, changePeriod } = usePeriod()
  const { visible, totals, collections } = financePeriod(finance.movements, payments, period)
  useEffect(() => { document.title = 'Finanzas | SIGE' }, [])
  return (
    <div className="max-w-6xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 tabIndex={-1} className="text-3xl font-semibold tracking-tight">Finanzas</h1>
          <p className="mt-2 text-sm text-muted">Movimientos en pesos colombianos.</p>
        </div>
        <PeriodField period={period} onChange={changePeriod} />
      </div>
      <Totals totals={totals} collections={collections} />
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="panel" aria-labelledby="finance-list-heading">
          <h2 id="finance-list-heading" className="text-lg font-semibold">Movimientos del periodo</h2>
          {visible.length === 0 ? <p className="mt-2 text-sm text-muted" role="status">No hay movimientos para este periodo.</p> : (
            <ul className="mt-2 divide-y divide-line">
              {visible.map(({ id, kind, date, amount, detail, account }) => (
                <li className="flex flex-wrap items-start justify-between gap-2 py-3 [overflow-wrap:anywhere]" key={id}>
                  <div className="min-w-0">
                    <p className="font-semibold">{detail}</p>
                    <p className="text-sm text-muted">{formatDate(date)} · {account}</p>
                  </div>
                  <div><span className="status status-pending">{kind}</span> <strong>{formatAmount(amount)}</strong></div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <MovementForm onAdd={(movement) => {
          finance.addMovement(movement)
          changePeriod(movement.date.slice(0, 7))
        }} />
      </div>
    </div>
  )
}
