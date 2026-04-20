import { useAuth } from '../context/AuthContext'
import { Clock, LogOut, CheckCircle, Mail } from 'lucide-react'

export default function PendingPage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-5 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] opacity-10"
          style={{ background: 'radial-gradient(ellipse, #F59E0B 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm text-center fade-up relative z-10">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <Clock size={36} className="text-brand-orange" />
        </div>

        <h2 className="text-xl font-bold text-brand-text mb-2">Solicitud en revisión</h2>
        <p className="text-sm text-brand-muted mb-6">
          Hola <strong className="text-brand-text">{profile?.nombre_completo}</strong>,
          tu cuenta está pendiente de aprobación por el administrador.
        </p>

        <div className="glass-card p-5 mb-6 text-left">
          <p className="text-xs font-semibold text-brand-subtle uppercase tracking-wider mb-4">Próximos pasos</p>
          {[
            { icon: Mail, text: 'Confirma tu correo electrónico si aún no lo has hecho' },
            { icon: Clock, text: 'El admin revisará tu solicitud (menos de 24h)' },
            { icon: CheckCircle, text: 'Recibirás acceso una vez aprobado' },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
                <Icon size={13} className="text-brand-violet" />
              </div>
              <p className="text-sm text-brand-muted">{text}</p>
            </div>
          ))}
        </div>

        <button onClick={signOut}
          className="flex items-center gap-2 text-sm text-brand-subtle hover:text-brand-red transition-colors mx-auto">
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
