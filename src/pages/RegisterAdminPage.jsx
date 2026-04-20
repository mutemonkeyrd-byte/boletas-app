import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/shared/UI'
import { Shield, Eye, EyeOff } from 'lucide-react'

export default function RegisterAdminPage() {
  const { signUpAdmin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nombre_completo: '', email: '', password: '', pin: '' })
  const [show, setShow] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre_completo || !form.email || !form.password || !form.pin) { setError('Completa todos los campos'); return }
    if (form.password.length < 6) { setError('Contraseña mínimo 6 caracteres'); return }
    setLoading(true); setError('')
    const { error: err } = await signUpAdmin(form)
    if (err) { setError(err.message); setLoading(false); return }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-5 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] opacity-15"
          style={{ background: 'radial-gradient(ellipse, #06B6D4 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-[390px] fade-up relative z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#06B6D4,#3B82F6)' }}>
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-brand-text">Acceso Administrador</h1>
          <p className="text-sm text-brand-muted mt-1">Solo para personal autorizado</p>
        </div>

        <div className="glass-card p-6">
          <div className="rounded-xl p-3 mb-5 text-xs text-brand-cyan"
            style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
            🔐 Necesitas el PIN de administrador para crear esta cuenta. Solo el equipo autorizado lo tiene.
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm text-brand-red font-medium mb-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div><label className="label-dark">Nombre completo</label>
              <input className="input-dark" placeholder="Ej: Esteban García" value={form.nombre_completo} onChange={set('nombre_completo')} /></div>
            <div><label className="label-dark">Correo electrónico</label>
              <input className="input-dark" type="email" placeholder="admin@correo.com" inputMode="email" value={form.email} onChange={set('email')} /></div>
            <div><label className="label-dark">Contraseña</label>
              <div className="relative">
                <input className="input-dark pr-10" type={show ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} />
                <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-subtle"><Eye size={16} /></button>
              </div></div>
            <div><label className="label-dark">PIN de administrador</label>
              <div className="relative">
                <input className="input-dark pr-10 tracking-[0.3em] font-mono text-center" type={showPin ? 'text' : 'password'}
                  placeholder="••••" maxLength={8} inputMode="numeric" value={form.pin} onChange={set('pin')} />
                <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-subtle">
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div></div>

            <button type="submit" disabled={loading}
              className="w-full text-white font-semibold rounded-xl py-3.5 text-[15px] transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#06B6D4,#3B82F6)' }}>
              {loading ? <Spinner size="sm" /> : <><Shield size={16} /> Crear cuenta admin</>}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-brand-muted mt-4">
          <Link to="/login" className="text-brand-violet font-semibold">← Volver al login</Link>
        </p>
      </div>
    </div>
  )
}
