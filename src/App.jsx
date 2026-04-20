import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoadingScreen } from './components/shared/UI'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

import LoginPage          from './pages/LoginPage'
import RegisterPage       from './pages/RegisterPage'
import RegisterAdminPage  from './pages/RegisterAdminPage'
import PendingPage        from './pages/PendingPage'
import AdminLayout        from './components/admin/AdminLayout'
import AdminDashboard     from './pages/admin/AdminDashboard'
import AdminEventos       from './pages/admin/AdminEventos'
import AdminVendedores    from './pages/admin/AdminVendedores'
import AdminQRCodes       from './pages/admin/AdminQRCodes'
import AdminPagos         from './pages/admin/AdminPagos'
import AdminCuadre        from './pages/admin/AdminCuadre'
import VendorLayout       from './components/vendor/VendorLayout'
import VendorQRs          from './pages/vendor/VendorQRs'
import VendorPagos        from './pages/vendor/VendorPagos'
import VendorBalance      from './pages/vendor/VendorBalance'

// ── GUARDS ───────────────────────────────────────────────
function RootRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)    return <Navigate to="/login" replace />
  if (!profile) return <LoadingScreen />
  if (profile.rol === 'admin') return <Navigate to="/admin" replace />
  if (profile.estado !== 'aprobado') return <Navigate to="/pendiente" replace />
  return <Navigate to="/vendor" replace />
}

function RequireAdmin({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)    return <Navigate to="/login" replace />
  if (!profile) return <LoadingScreen />
  if (profile.rol !== 'admin') return <Navigate to="/" replace />
  return children
}

function RequireVendor({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)    return <Navigate to="/login" replace />
  if (!profile) return <LoadingScreen />
  if (profile.rol === 'admin') return <Navigate to="/admin" replace />
  if (profile.estado !== 'aprobado') return <Navigate to="/pendiente" replace />
  return children
}

// ── ADMIN LAYOUT WITH LIVE BADGE COUNTS ─────────────────
function AdminLayoutWithCounts() {
  const [pendientes, setPendientes]           = useState(0)
  const [pagosPendientes, setPagosPendientes] = useState(0)

  useEffect(() => {
    async function load() {
      const [v, p] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('rol', 'vendedor').eq('estado', 'pendiente'),
        supabase.from('pagos').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      ])
      setPendientes(v.count || 0)
      setPagosPendientes(p.count || 0)
    }
    load()
    const ch = supabase.channel('badge-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  return <AdminLayout pendientes={pendientes} pagosPendientes={pagosPendientes} />
}

// ── ROUTES ───────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/"              element={<RootRedirect />} />
      <Route path="/login"         element={<LoginPage />} />
      <Route path="/registro"      element={<RegisterPage />} />
      <Route path="/registro-admin" element={<RegisterAdminPage />} />
      <Route path="/pendiente"     element={<PendingPage />} />

      <Route path="/admin" element={<RequireAdmin><AdminLayoutWithCounts /></RequireAdmin>}>
        <Route index              element={<AdminDashboard />} />
        <Route path="eventos"     element={<AdminEventos />} />
        <Route path="vendedores"  element={<AdminVendedores />} />
        <Route path="qrcodes"     element={<AdminQRCodes />} />
        <Route path="pagos"       element={<AdminPagos />} />
        <Route path="cuadre"      element={<AdminCuadre />} />
      </Route>

      <Route path="/vendor" element={<RequireVendor><VendorLayout /></RequireVendor>}>
        <Route index           element={<VendorQRs />} />
        <Route path="pagos"    element={<VendorPagos />} />
        <Route path="balance"  element={<VendorBalance />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
