export const demoProfiles = {
  secretaria: {
    email: 'secretaria@example.com',
    password: 'SigeSec2027!',
    label: 'Secretaría',
    shortcuts: [
      { title: 'Buscar estudiante', description: 'Abre el listado de estudiantes.', to: '/estudiantes' },
      { title: 'Nueva matrícula', description: 'Busca un estudiante para matricularlo.', to: '/matriculas/nueva' },
      { title: 'Nuevo estudiante', description: 'Abre el formulario de registro.', to: '/estudiantes/nuevo' },
    ],
  },
  tesoreria: {
    email: 'tesoreria@example.com',
    password: 'SigeTes2027!',
    label: 'Tesorería',
    shortcuts: [
      { title: 'Consultar cartera', description: 'Abre el módulo de saldos y obligaciones.', to: '/cartera' },
      { title: 'Registrar pago', description: 'Selecciona un cargo y registra un abono.', to: '/pagos/nuevo' },
      { title: 'Consultar recibos', description: 'Abre el módulo de comprobantes.', to: '/recibos' },
    ],
  },
  administracion: {
    email: 'administracion@example.com',
    password: 'SigeAdm2027!',
    label: 'Administración',
    shortcuts: [
      { title: 'Consultar movimientos', description: 'Abre el módulo de finanzas.', to: '/finanzas' },
      { title: 'Consultar cartera', description: 'Abre el módulo de saldos y obligaciones.', to: '/cartera' },
      { title: 'Ver auditoría', description: 'Abre el historial de operaciones.', to: '/auditoria' },
    ],
  },
  completo: {
    email: 'completo@example.com',
    password: 'SigeTotal2027!',
    label: 'Acceso completo',
    shortcuts: [
      { title: 'Nueva matrícula', description: 'Busca un estudiante para matricularlo.', to: '/matriculas/nueva' },
      { title: 'Consultar cartera', description: 'Abre el módulo de saldos y obligaciones.', to: '/cartera' },
      { title: 'Ver auditoría', description: 'Abre el historial de operaciones.', to: '/auditoria' },
    ],
  },
}

export type DemoProfile = keyof typeof demoProfiles

export const demoProfileKeys = Object.keys(demoProfiles) as DemoProfile[]
