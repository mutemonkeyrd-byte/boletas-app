import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../shared/UI'
import { LayoutDashboard, CalendarDays, Users, QrCode, CreditCard, BarChart3, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/admin',            icon: LayoutDashboard, label: 'Dashboard',  exact: true },
  { to: '/admin/eventos',    icon: CalendarDays,    label: 'Eventos' },
  { to: '/admin/vendedores', icon: Users,           label: 'Vendedores', badge: 'pendientes' },
  { to: '/admin/qrcodes',    icon: QrCode,          label: 'QR Codes' },
  { to: '/admin/pagos',      icon: CreditCard,      label: 'Pagos',      badge: 'pagos' },
  { to: '/admin/cuadre',     icon: BarChart3,       label: 'Cuadre' },
]

export default function AdminLayout({ pendientes = 0, pagosPendientes = 0 }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      {/* SIDEBAR */}
      <aside className={clsx(
        'flex-shrink-0 sidebar-glass flex flex-col transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[220px]'
      )}>
        {/* Logo */}
        <div className="px-3 py-5 sep-dark flex items-center gap-3 min-h-[72px]">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg flex-shrink-0 shadow-glow"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>🎟</div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-brand-text truncate">BoletasApp</p>
              <p className="text-[10px] text-brand-subtle">Panel Admin</p>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-brand-subtle hover:text-brand-muted transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden space-y-0.5 px-2">
          {NAV.map(({ to, icon: Icon, label, badge, exact }) => {
            const count = badge === 'pendientes' ? pendientes : badge === 'pagos' ? pagosPendientes : 0
            return (
              <NavLink key={to} to={to} end={exact}
                className={({ isActive }) => clsx(
                  'nav-link',
                  collapsed ? 'justify-center px-2' : '',
                  isActive ? 'active' : ''
                )}>
                {({ isActive }) => (
                  <>
                    <Icon size={17} className={clsx('flex-shrink-0', isActive ? 'text-brand-violet' : 'text-brand-subtle')} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-[13.5px]">{label}</span>
                        {count > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                            style={{ background: 'rgba(239,68,68,0.9)', color: 'white' }}>
                            {count}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 sep-dark border-t border-brand-border/50">
          <div className={clsx('flex items-center gap-2.5', collapsed && 'justify-center')}>
            <Avatar name={profile?.nombre_completo} size="sm" />
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-brand-text truncate">{profile?.nombre_completo}</p>
                  <p className="text-[10px] text-brand-subtle">Administrador</p>
                </div>
                <button onClick={() => { signOut(); navigate('/login') }}
                  className="text-brand-subtle hover:text-brand-red transition-colors p-1">
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto min-w-0 bg-brand-bg">
        <Outlet />
      </main>
    </div>
  )
}
