export const fmtMoney = (n) =>
  n || n === 0 ? `RD$${Number(n).toLocaleString('es-DO')}` : '—'

export const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const fmtDateShort = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })
}

export const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export const todayISO = () => new Date().toISOString()

export const avatarGradient = (name) => {
  const g = [
    'from-purple-500 to-blue-500',
    'from-pink-500 to-purple-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-teal-500',
    'from-orange-500 to-pink-500',
    'from-violet-500 to-purple-500',
  ]
  return g[(name || 'A').charCodeAt(0) % g.length]
}

export const initials = (name) =>
  (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// QR Estado labels
export const qrEstadoLabel = {
  bloqueado:    'Bloqueado',
  desbloqueado: 'Desbloqueado',
  vendido:      'Vendido',
  entregado:    'Entregado',
}

// Pago estado labels
export const pagoEstadoLabel = {
  pendiente:  'Pendiente',
  aprobado:   'Aprobado',
  rechazado:  'Rechazado',
}

export const calcComision = (precioVenta, comisionConfig) => {
  if (!comisionConfig || !precioVenta) return 0
  if (comisionConfig.tipo === 'porcentaje') {
    return Math.round((precioVenta * comisionConfig.valor) / 100)
  }
  return comisionConfig.valor || 0
}
