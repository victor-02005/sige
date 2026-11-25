import { useId, useState } from 'react'
import { formatAmount } from './Billing'

type Series = { label: string; points: number[] }
type ChartType = 'lines' | 'points' | 'bars'
const colors = ['#2e7d32', '#2459a6', '#a14b19', '#7040a0']
const dashes = [undefined, '7 4', '2 4', '9 3 2 3']
const count = new Intl.NumberFormat('es-CO')

export default function StatisticChart({ title, labels, series, money = false }: {
  title: string
  labels: string[]
  series: Series[]
  money?: boolean
}) {
  const [type, setType] = useState<ChartType>('lines')
  const typeId = useId()
  const format = money ? formatAmount : (value: number) => count.format(value)
  const values = series.flatMap(({ points }) => points)
  const high = Math.max(1, ...values)
  const low = Math.min(0, ...values)
  const slotWidth = 576 / Math.max(labels.length, 1)
  const barWidth = Math.min(36, slotWidth * 0.76 / series.length)
  const x = (index: number) => {
    if (type === 'bars') return 12 + (index + 0.5) * slotWidth
    return labels.length === 1 ? 300 : 12 + index * 576 / (labels.length - 1)
  }
  const y = (value: number) => 156 - (value - low) * 144 / (high - low)
  const axisLabels = labels.length < 3 ? labels : [labels[0], labels[Math.floor((labels.length - 1) / 2)], labels[labels.length - 1]]

  return (
    <figure className="panel">
      <figcaption className="font-semibold text-brand-ink">{title}</figcaption>
      {labels.length === 0 ? <p className="mt-3 text-sm text-muted">Aún no hay datos para mostrar.</p> : (
        <>
          <div className="mt-3">
            <label className="field-label" htmlFor={typeId}>Tipo de gráfica<span className="sr-only"> · {title}</span></label>
            <select className="field max-w-56 text-sm" id={typeId} value={type} onChange={(event) => {
              const value = event.target.value
              if (value === 'lines' || value === 'points' || value === 'bars') setType(value)
            }}>
              <option value="lines">Líneas con puntos</option>
              <option value="points">Solo puntos</option>
              <option value="bars">Barras</option>
            </select>
          </div>
          {series.length > 1 && <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {series.map(({ label }, index) => (
              <li className="flex items-center gap-2" key={label}>
                <span className="size-2.5 rounded-full" aria-hidden="true" style={{ backgroundColor: colors[index] }} />{label}
              </li>
            ))}
          </ul>}
          <div className="mt-4 text-xs text-muted" aria-hidden="true">
            <p>{format(high)}</p>
            <svg viewBox="0 0 600 168" className="block min-h-24 w-full" focusable="false">
              {[low, (high + low) / 2, high].map((value) => (
                <line key={value} x1="12" x2="588" y1={y(value)} y2={y(value)} stroke="var(--color-line)" vectorEffect="non-scaling-stroke" />
              ))}
              {series.map(({ label, points }, index) => (
                <g key={label}>
                  {type === 'lines' && <polyline fill="none" stroke={colors[index]} strokeWidth="2" strokeDasharray={dashes[index]} vectorEffect="non-scaling-stroke"
                    points={points.map((value, position) => `${x(position)},${y(value)}`).join(' ')} />}
                  {points.map((value, position) => type === 'bars' ? (
                    <rect key={position} x={x(position) + (index - series.length / 2) * barWidth + 1}
                      y={Math.min(y(0), y(value))} width={barWidth - 2} height={Math.abs(y(0) - y(value))} fill={colors[index]} />
                  ) : (
                    <circle key={position} cx={x(position)} cy={y(value)} r="5" fill={colors[index]} stroke="white" strokeWidth="1" />
                  ))}
                </g>
              ))}
            </svg>
            <p>{format(low)}</p>
            <div className="mt-2 flex flex-wrap justify-between gap-2">
              {axisLabels.map((label, index) => <span className="max-w-[30%] [overflow-wrap:anywhere]" key={index}>{label}</span>)}
            </div>
          </div>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-brand-green">Ver datos de la gráfica</summary>
            <dl className="mt-2 divide-y divide-line">
              {labels.map((label, position) => (
                <div className="py-2 [overflow-wrap:anywhere]" key={position}>
                  <dt className="font-semibold">{label}</dt>
                  {series.map((item) => (
                    <dd className="text-muted" key={item.label}>{series.length > 1 && `${item.label} · `}{format(item.points[position])}</dd>
                  ))}
                </div>
              ))}
            </dl>
          </details>
        </>
      )}
    </figure>
  )
}
