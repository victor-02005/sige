import { startTransition, useEffect, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { GradesAndGroups, SchoolYears } from './AcademicSettings'
import type { SchoolYear, SchoolGroup } from './AcademicSettings'
import { AuditLog, Institution, UsersAndRoles, NewUser, useAudit, useDemoUsers, useInstitution } from './Administration'
import { Billing, Receivables, useBilling } from './Billing'
import DemoAccess from './DemoAccess'
import Enrollments from './Enrollments'
import type { Enrollment } from './Enrollments'
import Finance, { FinanceSummary, useFinance } from './Finance'
import Guardians, { useGuardianDirectory } from './Guardians'
import { Payments, Receipts } from './Payments'
import Students from './Students'
import Statistics from './Statistics'
import type { Student } from './Students'
import { demoProfileKeys, demoProfiles } from './demoProfiles'
import type { DemoProfile } from './demoProfiles'

const sections = [
  {
    label: 'Académico',
    pages: [
      ['/estudiantes', 'Estudiantes'],
      ['/acudientes', 'Acudientes'],
      ['/matriculas', 'Matrículas'],
      ['/anos-escolares', 'Año escolar'],
      ['/grados-y-grupos', 'Grados y grupos'],
    ],
  },
  {
    label: 'Tesorería',
    pages: [
      ['/cartera', 'Cartera'],
      ['/cobros', 'Cobros'],
      ['/pagos', 'Pagos'],
      ['/recibos', 'Recibos'],
      ['/finanzas', 'Finanzas'],
    ],
  },
  {
    label: 'Administración',
    pages: [
      ['/institucion', 'Institución y sede'],
      ['/usuarios-y-roles', 'Usuarios y roles'],
      ['/auditoria', 'Auditoría'],
    ],
  },
]

const sharedPages = ['/estudiantes', '/acudientes']
const canUseAcademic = (profile: DemoProfile) => profile !== 'tesoreria'
const canUseTreasury = (profile: DemoProfile) => profile !== 'secretaria'

function canOpen(profile: DemoProfile, path: string) {
  if (sharedPages.includes(path)) return true
  const section = sections.find((item) => item.pages.some(([page]) => page === path))
  if (section?.label === 'Administración') return profile === 'administracion' || profile === 'completo'
  if (section?.label === 'Académico') return canUseAcademic(profile)
  if (section?.label === 'Tesorería') return canUseTreasury(profile)
  return true
}

function Shell({ profile, onSignOut }: { profile: DemoProfile; onSignOut: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const main = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const previousPath = useRef(pathname)
  const area = '/' + pathname.split('/')[1]
  const permitted = canOpen(profile, area)

  useEffect(() => {
    if (pathname === previousPath.current) return

    previousPath.current = pathname
    main.current?.querySelector('h1')?.focus()
  }, [pathname])

  function closeMenu() {
    setMenuOpen(false)
    if (menuOpen) menuButton.current?.focus()
  }

  return (
    <div
      className="flex min-h-dvh flex-col"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) closeMenu()
      }}
    >
      <a className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-3" href="#contenido">
        Saltar al contenido
      </a>
      <header className="bg-brand-ink text-white">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
          <Link className="flex items-center gap-3 rounded-md" to="/inicio" onClick={closeMenu}>
            <span className="grid size-9 place-items-center rounded-lg bg-brand-green font-bold" aria-hidden="true">S</span>
            <span className="text-lg font-semibold tracking-wide">SIGE</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link className="flex min-h-11 items-center rounded-lg px-2 text-sm underline underline-offset-4" to="/acceso">
              Cambiar cuenta
            </Link>
            <button className="min-h-11 cursor-pointer rounded-lg px-2 text-sm underline underline-offset-4" type="button" onClick={() => {
              startTransition(() => {
                onSignOut()
                navigate('/', { replace: true })
              })
            }}>Cerrar sesión</button>
            <button
              className="min-h-11 rounded-lg border border-white/50 px-3 text-sm font-semibold lg:hidden"
              ref={menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="menu-principal"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? 'Cerrar menú' : 'Menú'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <nav
          id="menu-principal"
          aria-label="Navegación principal"
          className={`${menuOpen ? 'block' : 'hidden'} border-b border-line bg-white px-4 py-4 lg:block lg:border-r lg:border-b-0`}
        >
          <NavLink className="menu-link" to="/inicio" onClick={closeMenu} end>Inicio</NavLink>
          <NavLink className="menu-link" to="/estadisticas" onClick={closeMenu}>Estadísticas</NavLink>

          {sections.map(({ label, pages }) => ({ label, pages: pages.filter(([path]) => canOpen(profile, path)) }))
            .filter((section) => section.pages.length > 0).map((section) => (
            <div className="mt-5" key={section.label}>
              <h2 className="px-3 pb-1 text-xs font-semibold text-muted">{section.label}</h2>
              <ul>
                {section.pages.map(([path, title]) => (
                  <li key={path}>
                    <NavLink className="menu-link" to={path} onClick={closeMenu}>{title}</NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <main id="contenido" ref={main} tabIndex={-1} className="min-w-0 px-4 py-7 sm:px-8 sm:py-10">
          {permitted ? <Outlet /> : (
            <>
              <PageHeading title="Acceso restringido" />
              <p className="mt-2 text-muted">Esta sección no está disponible para el perfil {demoProfiles[profile].label}.</p>
              <Link className="button button-primary mt-4 inline-flex items-center" to="/acceso">Cambiar cuenta</Link>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function PageHeading({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} | SIGE`
  }, [title])

  return <h1 tabIndex={-1} className="w-fit rounded-sm text-3xl font-semibold tracking-tight">{title}</h1>
}

function Home({ profile, finance, payments }: { profile: DemoProfile } & ComponentProps<typeof FinanceSummary>) {
  const { label, shortcuts } = demoProfiles[profile]

  return (
    <div className="max-w-5xl">
      <PageHeading title="Inicio" />
      <p className="mt-2 text-sm text-muted">Perfil · {label}</p>
      <section className="mt-8" aria-labelledby="shortcuts-heading">
        <h2 id="shortcuts-heading" className="text-lg font-semibold text-brand-ink">Accesos rápidos</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map(({ title, description, to }) => (
            <li key={to}>
              <Link className="panel flex h-full items-start justify-between gap-3 transition-colors hover:border-brand-green hover:bg-success-surface" to={to}>
                <span>
                  <span className="block font-semibold text-brand-ink">{title}</span>
                  <span className="mt-1 block text-sm text-muted">{description}</span>
                </span>
                <span className="text-brand-green" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {canUseTreasury(profile) && <FinanceSummary finance={finance} payments={payments} />}
    </div>
  )
}

function Landing({ signedIn }: { signedIn: boolean }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-brand-ink px-4 py-8">
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <PageHeading title="SIGE" />
        <p className="mt-2 text-muted">Sistema Integral de Gestión Educativa</p>
        <Link className="button button-primary mt-6 inline-flex items-center" to={signedIn ? '/inicio' : '/acceso'}>
          {signedIn ? 'Ir a Inicio' : 'Iniciar sesión'}
        </Link>
      </div>
    </main>
  )
}

export default function App() {
  const [profile, setProfile] = useState<DemoProfile | null>(null)
  const [years, setYears] = useState<SchoolYear[]>([])
  const [groups, setGroups] = useState<SchoolGroup[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const { operations, record } = useAudit(profile)
  const guardianDirectory = useGuardianDirectory(record)
  const billing = useBilling(record)
  const finance = useFinance(record)
  const institution = useInstitution(record)
  const users = useDemoUsers(record)

  function saveEnrollment(enrollment: Enrollment) {
    if (enrollments.some((item) => item.studentId === enrollment.studentId && item.year === enrollment.year)) return
    setEnrollments((current) => current.some((item) => item.studentId === enrollment.studentId && item.year === enrollment.year)
      ? current
      : [enrollment, ...current])
    record('Registró matrícula', `${students.find((item) => item.id === enrollment.studentId)?.code ?? 'Estudiante'} · ${enrollment.year} · ${enrollment.name}`)
  }

  function saveStudent(student: Student) {
    const previous = students.find((item) => item.id === student.id)
    if (previous?.name === student.name && previous.code === student.code && previous.archived === student.archived
      && previous.grade === student.grade && previous.year === student.year) return
    setStudents((current) => current.some((item) => item.id === student.id)
      ? current.map((item) => item.id === student.id ? student : item)
      : [student, ...current])
    record(!previous ? 'Creó estudiante' : student.archived && !previous.archived ? 'Archivó estudiante' : 'Actualizó estudiante', student.code)
  }

  const academicPages = {
    '/anos-escolares': (
      <SchoolYears years={years} onAdd={(year) => {
        setYears((current) => [...current, year].sort((a, b) => b.year - a.year))
        record('Creó año escolar', String(year.year))
      }} />
    ),
    '/grados-y-grupos': (
      <GradesAndGroups years={years} groups={groups} onAdd={(group) => {
        setGroups((current) => [...current, group])
        record('Creó grupo', `${group.year} · ${group.grade} · ${group.name}`)
      }} />
    ),
  }

  const access = {
    onEnter: (email: string, password: string) => {
      const builtIn = demoProfileKeys.find((key) => demoProfiles[key].email === email && demoProfiles[key].password === password)
      const next = builtIn ?? users.users.find((user) => user.active && user.email === email && user.password === password)?.role
      if (!next) return false
      setProfile(next)
      return true
    },
    onExpire: () => setProfile(null),
  }

  return (
    <Routes>
      <Route path="/" element={<Landing signedIn={!!profile} />} />
      <Route path="/acceso" element={<DemoAccess onEnter={access.onEnter} />} />
      <Route element={profile ? <Shell profile={profile} onSignOut={access.onExpire} /> : <Navigate to="/acceso" replace />}>
        <Route path="/inicio" element={profile ? <Home profile={profile} finance={finance} payments={billing.payments} /> : null} />
        <Route path="/estadisticas" element={profile && (
          <>
            <PageHeading title="Estadísticas" />
            <Statistics
              academic={canUseAcademic(profile) ? { students, enrollments, directory: guardianDirectory, years, groups } : undefined}
              billing={canUseTreasury(profile) ? billing : undefined}
              finance={finance}
            />
          </>
        )} />
        <Route path="/estudiantes/*" element={<Students students={students} years={years} directory={guardianDirectory} enrollments={enrollments} onSave={saveStudent} academicAccess={!!profile && canUseAcademic(profile)} treasuryAccess={!!profile && canUseTreasury(profile)} />} />
        <Route path="/acudientes/*" element={<Guardians students={students} directory={guardianDirectory} canManage={!!profile && canUseAcademic(profile)} />} />
        <Route path="/matriculas/*" element={<Enrollments students={students} years={years} groups={groups} directory={guardianDirectory} enrollments={enrollments} onEnroll={saveEnrollment} />} />
        <Route path="/cobros/*" element={<Billing billing={billing} students={students} />} />
        <Route path="/cartera/*" element={<Receivables billing={billing} students={students} />} />
        <Route path="/pagos/*" element={<Payments billing={billing} students={students} canReverse={profile === 'administracion' || profile === 'completo'} />} />
        <Route path="/recibos/*" element={<Receipts billing={billing} students={students} />} />
        <Route path="/finanzas" element={<Finance finance={finance} payments={billing.payments} />} />
        <Route path="/anos-escolares" element={<><PageHeading title="Año escolar" />{academicPages['/anos-escolares']}</>} />
        <Route path="/grados-y-grupos" element={<><PageHeading title="Grados y grupos" />{academicPages['/grados-y-grupos']}</>} />
        <Route path="/institucion" element={<><PageHeading title="Institución y sede" /><Institution {...institution} /></>} />
        <Route path="/usuarios-y-roles" element={<><PageHeading title="Usuarios y roles" /><UsersAndRoles {...users} /></>} />
        <Route path="/usuarios-y-roles/nuevo" element={<><PageHeading title="Agregar usuario" /><NewUser save={users.save} /></>} />
        <Route path="/auditoria" element={<><PageHeading title="Auditoría" /><AuditLog operations={operations} /></>} />
        <Route
          path="*"
          element={(
            <>
              <PageHeading title="Página no encontrada" />
              <Link className="button button-primary mt-5 inline-flex items-center" to="/inicio">Volver a Inicio</Link>
            </>
          )}
        />
      </Route>
    </Routes>
  )
}
