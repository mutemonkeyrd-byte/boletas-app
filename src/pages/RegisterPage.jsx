import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/shared/UI'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const { signUpVendedor } = useAuth()
  const [form, setForm] = useState({ nombre_completo: '', telefono: '', email: '', password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [done, setDone]     = useState(false)

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre_completo || !form.email || !form.password || !form.telefono) { setError('Completa todos los campos'); return }
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { setError('Mínimo 6 caracteres'); return }
    setLoading(true); setError('')
    const { error: err } = await signUpVendedor(form)
    if (err) { setError(err.message); setLoading(false); return }
    setDone(true); setLoading(false)
  }

  if (done) return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-5">
      <div className="w-full max-w-sm text-center fade-up">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <CheckCircle size={36} className="text-brand-green" />
        </div>
        <h2 className="text-xl font-bold text-brand-text mb-2">¡Solicitud enviada!</h2>
        <p className="text-sm text-brand-muted mb-2">Revisa tu correo <strong className="text-brand-text">{form.email}</strong> para confirmar tu cuenta.</p>
        <p className="text-sm text-brand-muted mb-6">El administrador revisará tu solicitud y te avisará cuando seas aprobado.</p>
        <Link to="/login" className="btn-full inline-flex">Ir al inicio</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-5 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] opacity-15"
          style={{ background: 'radial-gradient(ellipse, #7C3AED 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-[390px] fade-up relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-[16px] items-center justify-center text-2xl mb-3"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>🎟</div>
          <h1 className="text-[22px] font-bold text-brand-text">Registro de vendedor</h1>
          <p className="text-sm text-brand-muted mt-1">Solicita acceso para vender tickets</p>
        </div>

        <div className="glass-card p-6">
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm text-brand-red font-medium mb-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><label className="label-dark">Nombre completo</label>
              <input className="input-dark" placeholder="Ej: Ricardo Mejía" value={form.nombre_completo} onChange={set('nombre_completo')} /></div>
            <div><label className="label-dark">Teléfono / WhatsApp</label>
              <input className="input-dark" placeholder="809-000-0000" type="tel" inputMode="tel" value={form.telefono} onChange={set('telefono')} /></div>
            <div><label className="label-dark">Correo electrónico</label>
              <input className="input-dark" type="email" placeholder="tu@correo.com" inputMode="email" value={form.email} onChange={set('email')} /></div>
            <div><label className="label-dark">Contraseña</label>
              <div className="relative">
                <input className="input-dark pr-10" type={show ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} />
                <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-subtle"><Eye size={16} /></button>
              </div></div>
            <div><label className="label-dark">Confirmar contraseña</label>
              <input className="input-dark" type="password" placeholder="Repite la contraseña" value={form.confirm} onChange={set('confirm')} /></div>
            <div className="rounded-xl p-3 text-xs text-brand-violet"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
              💡 Tu solicitud será revisada por el admin antes de que puedas ingresar.
            </div>
            <button type="submit" disabled={loading} className="btn-full mt-1">
              {loading ? <Spinner size="sm" /> : 'Enviar solicitud'}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-brand-muted mt-4">
          ¿Ya tienes cuenta? <Link to="/login" className="text-brand-violet font-semibold">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
