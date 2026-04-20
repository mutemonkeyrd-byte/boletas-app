import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/shared/UI'
import { Eye, EyeOff, Ticket } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]   = useState({ email: '', password: '' })
  const [show, setShow]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) { setError('Completa todos los campos'); return }
    setLoading(true); setError('')
    const { error: err } = await signIn(form)
    if (err) { setError('Correo o contraseña incorrectos'); setLoading(false); return }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-5 relative overflow-hidden">
      {/* BG effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20"
          style={{ background: 'radial-gradient(ellipse, #7C3AED 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 opacity-10"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 left-0 w-64 h-64 opacity-10"
          style={{ background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-[380px] fade-up relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-[20px] items-center justify-center text-3xl mb-4 shadow-glow"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)' }}>
            🎟
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-brand-text">BoletasApp</h1>
          <p className="text-sm text-brand-muted mt-1">Control de ventas físicas</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6">
          <h2 className="text-[17px] font-semibold text-brand-text mb-5">Iniciar sesión</h2>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm text-brand-red font-medium mb-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label-dark">Correo electrónico</label>
              <input className="input-dark" type="email" placeholder="tu@correo.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                autoComplete="email" inputMode="email" />
            </div>
            <div>
              <label className="label-dark">Contraseña</label>
              <div className="relative">
                <input className="input-dark pr-10"
                  type={show ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-subtle hover:text-brand-muted transition-colors">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-full mt-2">
              {loading ? <Spinner size="sm" /> : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-5 flex flex-col gap-2 text-center">
          <p className="text-sm text-brand-muted">
            ¿Eres vendedor nuevo?{' '}
            <Link to="/registro" className="text-brand-violet font-semibold hover:text-brand-blue transition-colors">
              Registrarse
            </Link>
          </p>
          <p className="text-sm text-brand-muted">
            ¿Eres administrador?{' '}
            <Link to="/registro-admin" className="text-brand-cyan font-semibold hover:text-brand-blue transition-colors">
              Acceso admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
