import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { formatAmount, formatDate, today } from './Billing'
import type { BillingProps, Payment } from './Billing'

const receiptNumber = (payment: Payment) => `REC-${String(payment.number).padStart(4, '0')}`

function Heading({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} | SIGE`
  }, [title])
  return <h1 tabIndex={-1} className="text-3xl font-semibold tracking-tight">{title}</h1>
}

function NewPayment({ billing, students }: BillingProps) {
  const [params] = useSearchParams()
  const available = billing.charges.filter((item) => billing.balance(item) > 0)
  const [chargeId, setChargeId] = useState(params.get('cargo') ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const [review, setReview] = useState(false)
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const submitted = useRef(false)
  const navigate = useNavigate()
  const charge = available.find((item) => item.id === chargeId)
  const student = students.find((item) => item.id === charge?.studentId)
  const balance = charge ? billing.balance(charge) : 0
  const value = Number(amount)

  useEffect(() => {
    if (review) reviewHeading.current?.focus()
  }, [review])

  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!charge || !student || !Number.isSafeInteger(value) || value < 1 || value > balance) {
      setError('El importe debe ser un número entero de pesos entre $1 y el saldo pendiente.')
      return
    }
    setError('')
    setReview(true)
  }

  function confirm() {
    if (!charge || !student || submitted.current) return
    submitted.current = true
    const id = crypto.randomUUID()
    if (billing.addPayment({ id, chargeId, studentName: student.name, studentCode: student.code, amount: value, date, method, reference: reference.trim() })) {
      navigate(`/recibos/${id}`, { replace: true })
    } else {
      submitted.current = false
      setReview(false)
      setError('El saldo cambió. Revisa el importe y vuelve a intentar.')
    }
  }

  return (
    <div className="max-w-2xl">
      <Link className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green underline" to={params.get('cargo') ? `/cartera/${params.get('cargo')}` : '/pagos'}>Volver</Link>
      <Heading title="Registrar pago" />
      {review && charge && student ? (
        <section className="panel mt-5" aria-labelledby="payment-review">
          <h2 id="payment-review" ref={reviewHeading} tabIndex={-1} className="text-lg font-semibold">Revisa el pago</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 [overflow-wrap:anywhere]">
            <div><dt className="text-sm text-muted">Estudiante y concepto</dt><dd>{student.name} · {charge.concept}</dd></div>
            <div><dt className="text-sm text-muted">Medio y fecha</dt><dd>{method} · {formatDate(date)}</dd></div>
            <div><dt className="text-sm text-muted">Importe del pago</dt><dd className="font-semibold">{formatAmount(value)}</dd></div>
            <div><dt className="text-sm text-muted">Saldo después del pago</dt><dd className="font-semibold">{formatAmount(balance - value)}</dd></div>
            {reference.trim() && <div><dt className="text-sm text-muted">Referencia</dt><dd>{reference.trim()}</dd></div>}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="button button-secondary" type="button" onClick={() => setReview(false)}>Editar pago</button>
            <button className="button button-primary" type="button" onClick={confirm}>Confirmar pago</button>
          </div>
        </section>
      ) : !available.length ? (
        <p className="panel mt-5 text-muted">No hay cargos con saldo pendiente. <Link className="text-brand-green underline" to="/cartera">Ver Cartera</Link>.</p>
      ) : (
        <form className="panel mt-5 grid gap-4" onSubmit={validate}>
          <div>
            <label className="field-label" htmlFor="payment-charge">Cargo</label>
            <select className="field" id="payment-charge" required value={charge?.id ?? ''} onChange={(event) => {
              setChargeId(event.target.value)
              setAmount('')
              setError('')
            }}>
              <option value="">Selecciona un cargo</option>
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {students.find((record) => record.id === item.studentId)?.name} · {item.concept} · {formatAmount(billing.balance(item))}
                </option>
              ))}
            </select>
          </div>
          {charge && <p className="text-sm text-muted">Saldo pendiente: <strong>{formatAmount(balance)}</strong></p>}
          <div>
            <label className="field-label" htmlFor="payment-amount">Importe en pesos colombianos</label>
            <input className="field" id="payment-amount" type="number" min="1" step="1" required value={amount}
              aria-invalid={!!error} aria-describedby={error ? 'payment-error' : undefined}
              onChange={(event) => { setAmount(event.target.value); setError('') }} />
            {error && <p className="field-error" id="payment-error" role="alert">{error}</p>}
            {charge && <button className="mt-1 min-h-11 cursor-pointer text-sm font-semibold text-brand-green underline" type="button" onClick={() => { setAmount(String(balance)); setError('') }}>Usar saldo completo</button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="payment-date">Fecha del pago</label>
              <input className="field" id="payment-date" type="date" min="1900-01-01" max={today()} value={date} required onChange={(event) => setDate(event.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="payment-method">Medio de pago</label>
              <select className="field" id="payment-method" value={method} required onChange={(event) => setMethod(event.target.value)}>
                <option value="">Selecciona un medio</option><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option>
              </select>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="payment-reference">Referencia (opcional)</label>
            <input className="field" id="payment-reference" value={reference} maxLength={60} onChange={(event) => setReference(event.target.value)} />
          </div>
          <button className="button button-primary w-fit" type="submit">Revisar pago</button>
        </form>
      )}
    </div>
  )
}

function PaymentList({ billing, receipts = false }: BillingProps & { receipts?: boolean }) {
  const [params] = useSearchParams()
  const chargeId = params.get('cargo')
  const records = billing.payments.filter((item) => !chargeId || item.chargeId === chargeId)

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading title={receipts ? 'Recibos' : 'Pagos'} />
        {!receipts && <Link className="button button-primary inline-flex items-center" to={chargeId ? `/pagos/nuevo?cargo=${chargeId}` : '/pagos/nuevo'}>Registrar pago</Link>}
      </div>
      {chargeId && <Link className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green underline" to={`/cartera/${chargeId}`}>Volver al cargo</Link>}
      <section className="panel mt-5" aria-label={receipts ? 'Listado de recibos' : 'Historial de pagos'}>
        {!records.length ? <p className="text-sm text-muted">{receipts ? 'Los recibos aparecerán cuando registres un pago.' : 'Todavía no hay pagos registrados.'}</p> : (
          <ul className="divide-y divide-line">
            {records.map((item) => (
              <li className="flex flex-wrap items-center justify-between gap-3 py-3 [overflow-wrap:anywhere]" key={item.id}>
                <div className="min-w-0">
                  <Link className="font-semibold text-brand-green underline underline-offset-4" to={`/${receipts ? 'recibos' : 'pagos'}/${item.id}`}>{receiptNumber(item)} · {item.studentName}</Link>
                  <p className="mt-1 text-sm text-muted">{formatDate(item.date)} · {item.method}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{formatAmount(item.amount)}</span>
                  <span className={`status ${item.reversed ? 'status-pending' : 'status-active'}`}>{item.reversed ? 'Reversado' : 'Registrado'}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function PaymentDetail({ billing, receipt = false, canReverse = false }: BillingProps & { receipt?: boolean; canReverse?: boolean }) {
  const { id } = useParams()
  const [showReverse, setShowReverse] = useState(false)
  const [reason, setReason] = useState('')
  const payment = billing.payments.find((item) => item.id === id)
  const charge = billing.charges.find((item) => item.id === payment?.chargeId)
  const parent = receipt ? '/recibos' : '/pagos'

  function reverse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canReverse || !payment || !reason.trim()) return
    billing.reversePayment(payment.id, reason.trim())
    setShowReverse(false)
    setReason('')
  }

  return (
    <div className="max-w-3xl">
      <Link className="receipt-controls mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green underline" to={parent}>Volver a {receipt ? 'Recibos' : 'Pagos'}</Link>
      <article className={receipt && payment ? 'receipt panel' : ''}>
        <Heading title={!payment ? (receipt ? 'Recibo no encontrado' : 'Pago no encontrado') : `${receipt ? 'Recibo' : 'Pago'} ${receiptNumber(payment)}`} />
        {payment && (
          <>
            <p className="mt-2 text-sm text-muted">{receipt ? 'SIGE · Recibo interno' : 'Detalle del pago'}</p>
            {payment.reversed && (
              <p className="mt-4 rounded-lg bg-canvas p-3 text-sm [overflow-wrap:anywhere]" role="status">
                <strong>Pago reversado</strong> el {formatDate(payment.reversed.date)}. Motivo: {payment.reversed.reason}
              </p>
            )}
            <dl className={`mt-5 grid gap-4 sm:grid-cols-2 [overflow-wrap:anywhere] ${receipt ? '' : 'panel'}`}>
              <div><dt className="text-sm text-muted">Estudiante</dt><dd>{payment.studentName} · {payment.studentCode}</dd></div>
              <div><dt className="text-sm text-muted">Concepto</dt><dd>{charge?.concept}</dd></div>
              <div><dt className="text-sm text-muted">Fecha del pago</dt><dd>{formatDate(payment.date)}</dd></div>
              <div><dt className="text-sm text-muted">Medio de pago</dt><dd>{payment.method}</dd></div>
              <div><dt className="text-sm text-muted">Importe recibido</dt><dd className="font-semibold">{formatAmount(payment.amount)}</dd></div>
              <div><dt className="text-sm text-muted">Saldo al registrar el pago</dt><dd className="font-semibold">{formatAmount(payment.balanceAfter)}</dd></div>
              {payment.reference && <div><dt className="text-sm text-muted">Referencia</dt><dd>{payment.reference}</dd></div>}
            </dl>
          </>
        )}
      </article>
      {payment && (
        <div className="receipt-controls mt-5 flex flex-wrap gap-2">
          {receipt ? (
            <>
              <button className="button button-primary" type="button" onClick={() => window.print()}>Imprimir recibo</button>
              <Link className="button button-secondary inline-flex items-center" to={`/pagos/${payment.id}`}>Ver pago</Link>
            </>
          ) : (
            <>
              <Link className="button button-primary inline-flex items-center" to={`/recibos/${payment.id}`}>Ver recibo</Link>
              {canReverse && !payment.reversed && <button className="button button-secondary" type="button" aria-expanded={showReverse} onClick={() => setShowReverse(!showReverse)}>Reversar pago</button>}
            </>
          )}
          {charge && <Link className="button button-secondary inline-flex items-center" to={`/cartera/${charge.id}`}>Ver saldo actual</Link>}
        </div>
      )}
      {canReverse && payment && !payment.reversed && showReverse && (
        <form className="panel mt-5 grid gap-4" onSubmit={reverse}>
          <div>
            <h2 className="text-lg font-semibold">Confirmar reversión</h2>
            <p className="mt-2 text-sm text-muted">El importe volverá al saldo pendiente y el pago seguirá en el historial.</p>
          </div>
          <div>
            <label className="field-label" htmlFor="reverse-reason">Motivo de la reversión</label>
            <input className="field" id="reverse-reason" required pattern=".*\S.*" maxLength={150} value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <button className="button button-primary w-fit" type="submit">Confirmar reversión</button>
        </form>
      )}
    </div>
  )
}

export function Payments(props: BillingProps & { canReverse: boolean }) {
  return <Routes><Route index element={<PaymentList {...props} />} /><Route path="nuevo" element={<NewPayment {...props} />} /><Route path=":id" element={<PaymentDetail {...props} />} /><Route path="*" element={<PaymentDetail {...props} />} /></Routes>
}

export function Receipts(props: BillingProps) {
  return <Routes><Route index element={<PaymentList {...props} receipts />} /><Route path=":id" element={<PaymentDetail {...props} receipt />} /><Route path="*" element={<PaymentDetail {...props} receipt />} /></Routes>
}
