import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { SchoolGroup, SchoolYear } from './AcademicSettings'
import { formatAmount, today } from './Billing'
import type { BillingProps } from './Billing'
import type { Enrollment } from './Enrollments'
import { FinanceSummary, financePeriod } from './Finance'
import type { useFinance } from './Finance'
import type { GuardianDirectory } from './Guardians'
import StatisticChart from './StatisticChart'
import type { Student } from './Students'

type Metric = { label: string; value: number }
const count = new Intl.NumberFormat('es-CO')

function Metrics({ items, money = false }: { items: Metric[]; money?: boolean }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value }) => (
        <div className="panel" key={label}>
          <dt className="text-sm font-semibold text-muted">{label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums [overflow-wrap:anywhere]">
            {money ? formatAmount(value) : count.format(value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Distribution({ title, rows, money = false }: { title: string; rows: Metric[]; money?: boolean }) {
  return <StatisticChart title={title} labels={rows.map(({ label }) => label)} series={[{ label: title, points: rows.map(({ value }) => value) }]} money={money} />
}

type AcademicData = {
  students: Student[]
  enrollments: Enrollment[]
  directory: GuardianDirectory
  years: SchoolYear[]
  groups: SchoolGroup[]
}

function AcademicStatistics({ students, enrollments, directory, years, groups }: AcademicData) {
  const active = students.filter((student) => !student.archived)
  const latestEnrollment = new Map<string, Enrollment>()
  for (const enrollment of enrollments) {
    const previous = latestEnrollment.get(enrollment.studentId)
    if (!previous || enrollment.year > previous.year) latestEnrollment.set(enrollment.studentId, enrollment)
  }
  const gradeCounts = new Map<string, number>()
  const yearCounts = new Map<number, number>()
  for (const student of active) {
    const latest = latestEnrollment.get(student.id)
    const grade = latest?.grade ?? student.grade ?? 'Sin grado indicado'
    gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1)
  }
  for (const { year } of enrollments) yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1)
  const withGuardian = new Set(directory.links.map((item) => item.studentId))
  const linked = active.filter((student) => withGuardian.has(student.id)).length
  const withPayer = active.filter((student) => !!directory.payers[student.id]).length

  return (
    <section className="mt-7" aria-labelledby="academic-statistics">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="academic-statistics" className="text-lg font-semibold text-brand-ink">Actividad académica</h2>
        <Link className="text-sm font-semibold text-brand-green underline underline-offset-4" to="/estudiantes">Ver estudiantes</Link>
      </div>
      <Metrics items={[
        { label: 'Estudiantes activos', value: active.length },
        { label: 'Estudiantes archivados', value: students.length - active.length },
        { label: 'Acudientes registrados', value: directory.guardians.length },
        { label: 'Matrículas registradas', value: enrollments.length },
        { label: 'Años escolares', value: years.length },
        { label: 'Grupos configurados', value: groups.length },
      ]} />
      <p className="mt-4 text-sm text-muted">El grado toma la matrícula más reciente o, si no existe, el grado indicado en la ficha.</p>
      <div className="mt-3 grid items-start gap-4 lg:grid-cols-2">
        <Distribution title="Estudiantes activos por grado" rows={Array.from(gradeCounts, ([label, value]) => ({ label, value }))} />
        <Distribution title="Matrículas por año escolar" rows={years.map(({ year }) => ({ label: String(year), value: yearCounts.get(year) ?? 0 }))} />
        <Distribution title="Acudientes de estudiantes activos" rows={[
          { label: 'Con acudiente vinculado', value: linked },
          { label: 'Sin acudiente vinculado', value: active.length - linked },
          { label: 'Con responsable de pago', value: withPayer },
        ]} />
        <Distribution title="Grupos por año escolar" rows={years.map(({ year }) => ({
          label: String(year), value: groups.filter((item) => item.year === year).length,
        }))} />
      </div>
    </section>
  )
}

function ReceivableStatistics({ billing }: Pick<BillingProps, 'billing'>) {
  const { charges, payments, balance } = billing
  const valid = payments.filter((item) => !item.reversed)
  const amountsByMethod = new Map<string, number>()
  for (const payment of valid) amountsByMethod.set(payment.method, (amountsByMethod.get(payment.method) ?? 0) + payment.amount)
  const date = today()
  let billed = 0
  let pending = 0
  let overdue = 0
  let settled = 0
  let late = 0
  for (const charge of charges) {
    const remaining = balance(charge)
    billed += charge.amount
    pending += remaining
    if (remaining === 0) settled++
    if (remaining > 0 && charge.due < date) {
      overdue += remaining
      late++
    }
  }

  return (
    <section className="mt-7" aria-labelledby="receivable-statistics">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="receivable-statistics" className="text-lg font-semibold text-brand-ink">Cobros, pagos y cartera acumulados</h2>
        <Link className="text-sm font-semibold text-brand-green underline underline-offset-4" to="/cartera">Ver cartera</Link>
      </div>
      <Metrics money items={[
        { label: 'Total de cargos', value: billed },
        { label: 'Pagos vigentes', value: valid.reduce((sum, item) => sum + item.amount, 0) },
        { label: 'Saldo por cobrar', value: pending },
        { label: 'Saldo vencido', value: overdue },
      ]} />
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Distribution title="Cargos por estado" rows={[
          { label: 'Pagados', value: settled },
          { label: 'Pendientes sin vencer', value: charges.length - settled - late },
          { label: 'Vencidos', value: late },
        ]} />
        <Distribution title="Importes recibidos por medio de pago" money rows={Array.from(amountsByMethod, ([label, value]) => ({ label, value }))} />
        <Distribution title="Registros de pago" rows={[
          { label: 'Vigentes', value: valid.length },
          { label: 'Reversados', value: payments.length - valid.length },
          { label: 'Recibos emitidos', value: payments.length },
        ]} />
      </div>
    </section>
  )
}

type StatisticsData = {
  academic?: AcademicData
  billing?: BillingProps['billing']
  finance: ReturnType<typeof useFinance>
}

const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
type Indicator = { label: string; value: (period: string) => number }

function Comparison({ indicators, years, money }: { indicators: Indicator[]; years: string[]; money: boolean }) {
  const [year, setYear] = useState(years[0])
  const [otherYear, setOtherYear] = useState(years[1])
  const [metric, setMetric] = useState(0)
  const [otherMetric, setOtherMetric] = useState(-1)
  const selected = otherMetric < 0 ? [indicators[metric]] : [indicators[metric], indicators[otherMetric]]
  const comparedYears = [year, otherYear].sort()
  const series = money
    ? selected.flatMap((item) => [year, otherYear].map((itemYear) => ({
      label: `${item.label} · ${itemYear}`,
      points: months.map((_, index) => item.value(`${itemYear}-${String(index + 1).padStart(2, '0')}`)),
    })))
    : selected.map((item) => ({ label: item.label, points: comparedYears.map(item.value) }))

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="field-label" htmlFor="stats-year">Año principal</label>
          <select className="field" id="stats-year" value={year} onChange={(event) => {
            const next = event.target.value
            if (next === otherYear) setOtherYear(year)
            setYear(next)
          }}>{years.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div>
          <label className="field-label" htmlFor="stats-other-year">Año de comparación</label>
          <select className="field" id="stats-other-year" value={otherYear} onChange={(event) => setOtherYear(event.target.value)}>
            {years.filter((item) => item !== year).map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="stats-metric">Indicador principal</label>
          <select className="field" id="stats-metric" value={metric} onChange={(event) => {
            const next = Number(event.target.value)
            if (next === otherMetric) setOtherMetric(-1)
            setMetric(next)
          }}>
            {indicators.map(({ label }, index) => <option key={label} value={index}>{label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="stats-other-metric">Segundo indicador</label>
          <select className="field" id="stats-other-metric" value={otherMetric} onChange={(event) => setOtherMetric(Number(event.target.value))}>
            <option value="-1">Sin segundo indicador</option>
            {indicators.map(({ label }, index) => index !== metric && <option key={label} value={index}>{label}</option>)}
          </select>
        </div>
      </div>
      <StatisticChart title={money ? 'Comparación por mes' : 'Comparación por año escolar'} labels={money ? months : comparedYears} series={series} money={money} />
    </>
  )
}

function StatisticsComparison({ academic, billing, finance }: StatisticsData) {
  const [domain, setDomain] = useState(academic ? 'academico' : 'financiero')
  const currentYear = Number(today().slice(0, 4))
  const years = new Set([String(currentYear), String(currentYear - 1)])
  let indicators: Indicator[] = []
  if (domain === 'academico' && academic) {
    for (const item of academic.years) years.add(String(item.year))
    indicators = [
      { label: 'Matrículas', value: (period) => academic.enrollments.filter((item) => String(item.year) === period).length },
      { label: 'Grupos configurados', value: (period) => academic.groups.filter((item) => String(item.year) === period).length },
      { label: 'Estudiantes activos con año indicado', value: (period) => academic.students.filter((item) => !item.archived && String(item.year) === period).length },
    ]
  } else if (billing) {
    for (const item of finance.movements) years.add(item.date.slice(0, 4))
    for (const item of billing.payments) years.add(item.date.slice(0, 4))
    for (const item of billing.charges) years.add(item.due.slice(0, 4))
    const summary = (period: string) => financePeriod(finance.movements, billing.payments, period)
    indicators = [
      { label: 'Ingresos', value: (period) => summary(period).totals.Ingreso },
      { label: 'Egresos', value: (period) => summary(period).totals.Egreso },
      { label: 'Transferencias', value: (period) => summary(period).totals.Transferencia },
      { label: 'Cobros recibidos', value: (period) => summary(period).collections },
      { label: 'Saldo actual por mes de vencimiento', value: (period) => billing.charges.reduce((sum, item) => item.due.startsWith(period) ? sum + billing.balance(item) : sum, 0) },
    ]
  }

  const availableYears = [...years].sort((a, b) => Number(b) - Number(a))
  return (
    <section className="mt-7" aria-labelledby="statistics-comparison">
      <h2 className="mb-3 text-lg font-semibold text-brand-ink" id="statistics-comparison">Comparar años e indicadores</h2>
      {academic && billing && (
        <div className="mb-3">
          <label className="field-label" htmlFor="stats-domain">Área</label>
          <select className="field max-w-xs" id="stats-domain" value={domain} onChange={(event) => setDomain(event.target.value)}>
            <option value="academico">Académica</option>
            <option value="financiero">Financiera</option>
          </select>
        </div>
      )}
      <Comparison key={domain} indicators={indicators} years={availableYears} money={domain === 'financiero'} />
      <p className="mt-2 text-sm text-muted">Los periodos sin registros aparecen con valor cero.</p>
    </section>
  )
}

export default function Statistics({ academic, billing, finance }: StatisticsData) {
  return (
    <div className="max-w-6xl">
      <p className="mt-2 text-sm text-muted">Indicadores calculados con los registros de SIGE.</p>
      <StatisticsComparison academic={academic} billing={billing} finance={finance} />
      {academic && <AcademicStatistics {...academic} />}
      {billing && (
        <>
          <ReceivableStatistics billing={billing} />
          <FinanceSummary finance={finance} payments={billing.payments} />
        </>
      )}
    </div>
  )
}
