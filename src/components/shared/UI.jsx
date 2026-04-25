import clsx from 'clsx'
import { X, Lock, Unlock, AlertTriangle } from 'lucide-react'
import { avatarGradient, initials, fmtMoney, comisionPorQR, depositoPorQR } from '../../lib/utils'

// ── AVATAR ────────────────────────────────────────────────
export function Avatar({ name, size = 'md', className }) {
  const sizes = { xs: 'w-6 h-6 text-[9px]', sm: 'w-8 h-8 text-[11px]', md: 'w-10 h-10 text-xs', lg: 'w-12 h-12 text-sm' }
  return (
    <div className={clsx(
      'rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br flex-shrink-0',
      sizes[size], avatarGradient(name), className
    )}>
      {initials(name)}
    </div>
  )
}

// ── BADGE ─────────────────────────────────────────────────
const BADGE_ESTADO = {
  bloqueado:    'badge-muted',
  desbloqueado: 'badge-orange',
  vendido:      'badge-blue',
  entregado:    'badge-green',
  pendiente:    'badge-orange',
  aprobado:     'badge-green',
  rechazado:    'badge-red',
  activo:       'badge-green',
  cerrado:      'badge-muted',
  borrador:     'badge-muted',
  aprobado_v:   'badge-green',
  pendiente_v:  'badge-orange',
  rechazado_v:  'badge-red',
}

const BADGE_LABEL = {
  bloqueado:    'Bloqueado',
  desbloqueado: 'Activo',
  vendido:      'Vendido',
  entregado:    'Entregado',
  pendiente:    'Pendiente',
  aprobado:     'Aprobado',
  rechazado:    'Rechazado',
  activo:       'Activo',
  cerrado:      'Cerrado',
  borrador:     'Borrador',
}

export function Badge({ estado, label, variant, className }) {
  const cls = variant ? `badge badge-${variant}` : `badge ${BADGE_ESTADO[estado] || 'badge-muted'}`
  const txt = label || BADGE_LABEL[estado] || estado
  return <span className={clsx(cls, className)}>{txt}</span>
}

// ── STAT CARD ─────────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, color = 'purple', className, trend }) {
  const colors = {
    purple: { text: 'text-brand-violet',  bg: 'bg-brand-purple/10',  border: 'border-brand-purple/20' },
    green:  { text: 'text-brand-green',   bg: 'bg-brand-green/10',   border: 'border-brand-green/20' },
    orange: { text: 'text-brand-orange',  bg: 'bg-brand-orange/10',  border: 'border-brand-orange/20' },
    red:    { text: 'text-brand-red',     bg: 'bg-brand-red/10',     border: 'border-brand-red/20' },
    blue:   { text: 'text-brand-blue',    bg: 'bg-brand-blue/10',    border: 'border-brand-blue/20' },
    cyan:   { text: 'text-brand-cyan',    bg: 'bg-brand-cyan/10',    border: 'border-brand-cyan/20' },
  }
  const c = colors[color]
  return (
    <div className={clsx('glass-card p-5 fade-up', className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold text-brand-subtle uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center border', c.bg, c.border)}>
            <Icon size={16} className={c.text} />
          </div>
        )}
      </div>
      <p className={clsx('text-[28px] font-bold tracking-tight leading-none', c.text)}>{value}</p>
      {sub && <p className="text-xs text-brand-muted mt-2">{sub}</p>}
    </div>
  )
}

// ── CARD ──────────────────────────────────────────────────
export function Card({ children, className, noPad, glow }) {
  return (
    <div className={clsx('glass-card', !noPad && 'overflow-hidden', glow && 'glow-purple', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={clsx('flex items-center justify-between px-5 py-4 sep-dark', className)}>
      <div>
        <h3 className="text-[15px] font-semibold text-brand-text">{title}</h3>
        {subtitle && <p className="text-xs text-brand-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ── PROGRESS BAR ──────────────────────────────────────────
export function ProgressBar({ value, max, color = 'bg-gradient-to-r from-brand-purple to-brand-blue', className }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={clsx('w-full h-1.5 rounded-full overflow-hidden', 'bg-brand-border', className)}>
      <div className={clsx('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── MODAL ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md', danger }) {
  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx(
        'relative w-full glass-card fade-up',
        sizes[size],
        danger && 'border-brand-red/30'
      )}>
        <div className="flex items-center justify-between px-5 py-4 sep-dark">
          <h2 className="text-[17px] font-semibold text-brand-text">{title}</h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-text transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X size={14} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── WARNING MODAL (for QR unlock) ─────────────────────────
export function UnlockWarningModal({ open, onClose, onConfirm, qrIndex, evento }) {
  if (!open) return null
  const precio   = Number(evento?.precio_boleta || 0)
  const comision = comisionPorQR(evento)
  const deposito = depositoPorQR(evento)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-card border-brand-orange/30 fade-up">
        <div className="p-6 text-center">
          {/* Warning icon */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <AlertTriangle size={28} className="text-brand-orange" />
          </div>

          <h3 className="text-[18px] font-bold text-brand-text mb-2">¿Tienes un comprador?</h3>
          <p className="text-sm text-brand-muted mb-4 leading-relaxed">
            Al desbloquear este ticket quedará <span className="text-brand-orange font-semibold">activo e irrevocable</span>.
            Es tu responsabilidad entregarlo al cliente.
          </p>

          {/* Money breakdown */}
          {precio > 0 && (
            <div className="rounded-xl p-3 mb-3 text-left"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-violet mb-2 text-center">💰 Dinero de este ticket</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-brand-muted">Cobras al cliente</span>
                  <span className="font-bold text-brand-text">{fmtMoney(precio)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-muted">Tu comisión</span>
                  <span className="font-bold text-brand-cyan">{fmtMoney(comision)}</span>
                </div>
                <div className="border-t border-brand-border/40 pt-1 mt-1 flex justify-between">
                  <span className="text-brand-text font-semibold">Depositas al admin</span>
                  <span className="font-bold text-brand-green">{fmtMoney(deposito)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Warning box */}
          <div className="rounded-xl p-3 mb-5 text-left"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-xs text-brand-orange font-semibold mb-1">⚠️ Importante</p>
            <ul className="text-xs text-brand-muted space-y-1">
              <li>• Desbloquea <strong className="text-brand-text">uno a la vez</strong></li>
              <li>• Solo si tienes el dinero o el cliente confirmado</li>
              <li>• Una vez desbloqueado no puede revertirse</li>
              <li>• Debes notificar el pago inmediatamente</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={onConfirm}
              className="flex-1 font-semibold rounded-xl px-4 py-2.5 text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: '#F59E0B' }}>
              <Unlock size={14} /> Sí, desbloquear
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── QR CARD ───────────────────────────────────────────────
export function QRCard({ qr, onUnlock, showUnlockBtn }) {
  const locked      = qr.estado === 'bloqueado'
  const unlocked    = qr.estado === 'desbloqueado'
  const sold        = qr.estado === 'vendido'
  const delivered   = qr.estado === 'entregado'

  const statusColor = {
    bloqueado:    'border-brand-border',
    desbloqueado: 'border-brand-orange/40',
    vendido:      'border-brand-blue/40',
    entregado:    'border-brand-green/40',
  }[qr.estado] || 'border-brand-border'

  return (
    <div className={clsx(
      'glass-card-light p-4 flex flex-col items-center gap-3 transition-all duration-300',
      unlocked && 'pulse-glow border-brand-orange/30',
      delivered && 'border-brand-green/20',
      statusColor
    )}>
      {/* QR Image */}
      <div className="relative w-full aspect-square max-w-[140px] rounded-xl overflow-hidden bg-white">
        {qr.qr_image_url ? (
          <img
            src={qr.qr_image_url}
            alt={`QR ${qr.qr_id}`}
            className={clsx(
              'w-full h-full object-contain transition-all duration-700',
              locked ? 'qr-locked' : 'qr-unlocked'
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <span className="text-4xl">🎟</span>
          </div>
        )}

        {/* Lock overlay */}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: 'rgba(10,10,15,0.5)', backdropFilter: 'blur(2px)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
              style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }}>
              <Lock size={18} className="text-brand-violet" />
            </div>
            <span className="text-[10px] text-brand-violet font-semibold">BLOQUEADO</span>
          </div>
        )}

        {/* Unlocked glow badge */}
        {unlocked && (
          <div className="absolute top-1.5 right-1.5">
            <span className="badge badge-orange text-[9px] px-1.5 py-0.5">ACTIVO</span>
          </div>
        )}
      </div>

      {/* QR ID */}
      <div className="text-center w-full">
        <p className="text-[10px] text-brand-subtle font-mono truncate">
          {locked ? '••••••••••••' : qr.qr_id}
        </p>
        <Badge estado={qr.estado} className="mt-1" />
      </div>

      {/* Unlock button */}
      {locked && showUnlockBtn && (
        <button
          onClick={() => onUnlock(qr)}
          className="w-full text-xs font-semibold py-2 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
          style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#8B5CF6' }}
        >
          <Unlock size={12} /> Desbloquear
        </button>
      )}

      {/* Alert for unlocked - must report payment */}
      {unlocked && (
        <div className="w-full rounded-lg p-2 text-center"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p className="text-[10px] text-brand-orange font-semibold">⚡ Notifica el pago ahora</p>
        </div>
      )}
    </div>
  )
}

// ── SPINNER ───────────────────────────────────────────────
export function Spinner({ size = 'md', className }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-[3px]' }
  return (
    <div className={clsx(
      'rounded-full border-brand-border border-t-brand-violet animate-spin',
      s[size], className
    )} />
  )
}

// ── LOADING SCREEN ────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🎟</div>
        <Spinner size="lg" className="mx-auto" />
        <p className="text-sm text-brand-muted mt-4">Cargando...</p>
      </div>
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────
export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-5xl mb-4 opacity-50">{icon}</div>
      <p className="font-semibold text-[15px] text-brand-text">{title}</p>
      {description && <p className="text-sm text-brand-muted mt-1.5 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ── ALERT BANNER ──────────────────────────────────────────
export function AlertBanner({ title, description, action, color = 'red', className }) {
  const colors = {
    red:    'bg-brand-red/8 border-brand-red/20 text-brand-red',
    orange: 'bg-brand-orange/8 border-brand-orange/20 text-brand-orange',
    blue:   'bg-brand-blue/8 border-brand-blue/20 text-brand-blue',
    green:  'bg-brand-green/8 border-brand-green/20 text-brand-green',
    purple: 'bg-brand-purple/8 border-brand-purple/20 text-brand-violet',
  }
  return (
    <div className={clsx('flex items-start gap-3 rounded-xl border p-3.5 mb-4', colors[color], className)}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs opacity-70 mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ── INFO ROW ──────────────────────────────────────────────
export function InfoRow({ label, value, className }) {
  return (
    <div className={clsx('flex justify-between items-start py-2.5 sep-dark last:border-0 text-sm', className)}>
      <span className="text-brand-muted flex-shrink-0 mr-4">{label}</span>
      <span className="font-medium text-brand-text text-right">{value}</span>
    </div>
  )
}

// ── FIELD ─────────────────────────────────────────────────
export function Field({ label, children, className, hint }) {
  return (
    <div className={clsx('mb-4', className)}>
      {label && <label className="label-dark">{label}</label>}
      {children}
      {hint && <p className="text-[11px] text-brand-subtle mt-1">{hint}</p>}
    </div>
  )
}

// ── TOAST ─────────────────────────────────────────────────
let _toastTimer
export function showToast(msg, type = 'success') {
  document.getElementById('app-toast')?.remove()
  clearTimeout(_toastTimer)
  const el = document.createElement('div')
  el.id = 'app-toast'
  const bg = type === 'success'
    ? 'background:linear-gradient(135deg,#10B981,#06B6D4)'
    : type === 'error'
    ? 'background:linear-gradient(135deg,#EF4444,#EC4899)'
    : 'background:linear-gradient(135deg,#7C3AED,#3B82F6)'
  el.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);${bg};color:white;padding:12px 20px;border-radius:14px;font-size:13.5px;font-weight:600;z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,0.4);font-family:-apple-system,sans-serif;white-space:nowrap;border:1px solid rgba(255,255,255,0.1)`
  el.textContent = msg
  document.body.appendChild(el)
  _toastTimer = setTimeout(() => el?.remove(), 3500)
}
