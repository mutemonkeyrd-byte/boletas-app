import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../shared/UI'
import { QrCode, CreditCard, BarChart3 } from 'lucide-react'
import clsx from 'clsx'

const TABS = [
  { to: '/vendor',         icon: QrCode,      label: 'Mis QRs',   exact: true },
  { to: '/vendor/pagos',   icon: CreditCard,  label: 'Pagos' },
  { to: '/vendor/balance', icon: BarChart3,   label: 'Balance' },
]

export default function VendorLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg max-w-[430px] mx-auto">
      {/* Header */}
      <header className="border-b border-brand-border/50 px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>🎟</div>
          <div>
            <p className="text-[14px] font-semibold text-brand-text leading-none">{profile?.nombre_completo}</p>
            <p className="text-[10px] text-brand-subtle mt-0.5">Vendedor · BoletasApp</p>
          </div>
        </div>
        <button onClick={() => { signOut(); navigate('/login') }}
          className="text-xs text-brand-subtle hover:text-brand-red transition-colors px-2 py-1 rounded">
          Salir
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom tabs */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-10 border-t border-brand-border/50"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="flex">
          {TABS.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact}
              className={({ isActive }) => clsx(
                'flex-1 flex flex-col items-center py-2.5 pb-4 transition-all',
                isActive ? 'text-brand-violet' : 'text-brand-subtle'
              )}>
              {({ isActive }) => (<>
                <Icon size={22} className={clsx('transition-transform', isActive && 'scale-110')} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={clsx('text-[10px] mt-1 font-medium', isActive ? 'text-brand-violet' : 'text-brand-subtle')}>
                  {label}
                </span>
              </>)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
