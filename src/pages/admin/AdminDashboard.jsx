import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmtMoney, fmtDate } from '../../lib/utils'
import { StatCard, Card, CardHeader, Badge, Avatar, ProgressBar, AlertBanner, EmptyState, Spinner } from '../../components/shared/UI'
import { QrCode, CheckCircle2, Banknote, Clock, Users, TrendingUp, CalendarDays, Plus } from 'lucide-react'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [eventos, setEventos] = useState([])
  const [eventoId, setEventoId] = useState('')
  const [stats, setStats] = useState(null)
  const [vendedores, setVendedores] = useState([])

  useEffect(() => { loadEventos() }, [])
  useEffect(() => { if (eventoId) loadStats(eventoId) }, [eventoId])

  async function loadEventos() {
    const { data } = await supabase.from('eventos').select('id,nombre,fecha_evento,estado').order('created_at', { ascending: false })
    setEventos(data || [])
    if (data?.length) {
      const activo = data.find(e => e.estado === 'activo') || data[0]
      setEventoId(activo.id)
    } else setLoading(false)
  }

  async function loadStats(eid) {
    setLoading(true)
    const [qrs, pagos, profs] = await Promise.all([
      supabase.from('qr_codes').select('*').eq('evento_id', eid),
      supabase.from('pagos').select('*').eq('evento_id', eid),
      supabase.from('profiles').select('id,nombre_completo,estado').eq('rol', 'vendedor'),
    ])
    const q = qrs.data || [], p = pagos.data || [], vs = profs.data || []
    const cobrado = p.filter(x => x.estado === 'aprobado').reduce((s, x) => s + Number(x.monto), 0)
    const pendMonto = p.filter(x => x.estado === 'pendiente').reduce((s, x) => s + Number(x.monto), 0)
    setStats({
      total: q.length,
      bloqueados: q.filter(x => x.estado === 'bloqueado').length,
      desbloqueados: q.filter(x => x.estado === 'desbloqueado').length,
      vendidos: q.filter(x => x.estado === 'vendido').length,
      entregados: q.filter(x => x.estado === 'entregado').length,
      cobrado, pendMonto,
      pagosPendientes: p.filter(x => x.estado === 'pendiente').length,
    })
    const vConQr = vs.filter(v => q.some(x => x.vendedor_id === v.id))
    setVendedores(vConQr.map(v => {
      const mis = q.filter(x => x.vendedor_id === v.id)
      const misPagos = p.filter(x => x.vendedor_id === v.id)
      const vendidos = mis.filter(x => ['vendido','entregado'].includes(x.estado)).length
      const cobrado = misPagos.filter(x => x.estado === 'aprobado').reduce((s, x) => s + Number(x.monto), 0)
      const pendiente = misPagos.filter(x => x.estado === 'pendiente').reduce((s, x) => s + Number(x.monto), 0)
      return { ...v, asignados: mis.length, vendidos, cobrado, pendiente }
    }))
    setLoading(false)
  }

  const evento = eventos.find(e => e.id === eventoId)

  return (
    <div>
      {/* TOPBAR */}
      <div className="sticky top-0 z-10 border-b border-brand-border/50 px-6 py-4 flex flex-wrap items-center gap-3 justify-between"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)' }}>
        <div>
          <h1 className="text-[22px] font-bold text-brand-text tracking-tight">Dashboard</h1>
          {evento && <p className="text-xs text-brand-muted">{evento.nombre} · {fmtDate(evento.fecha_evento)}</p>}
        </div>
        <div className="flex items-center gap-3">
          {eventos.length > 0 && (
            <select className="select-dark text-sm w-auto py-2 px-3" value={eventoId || ''} onChange={e => setEventoId(e.target.value)}>
              {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
            </select>
          )}
          <button onClick={() => navigate('/admin/eventos')} className="btn-primary text-sm">
            <CalendarDays size={14} /> Eventos
          </button>
        </div>
      </div>

      <div className="p-6">
        {eventos.length === 0 && !loading && (
          <EmptyState icon="🎪" title="Sin eventos" description="Crea tu primer evento para comenzar"
            action={<button onClick={() => navigate('/admin/eventos')} className="btn-primary"><Plus size={14} />Crear evento</button>} />
        )}

        {loading && eventos.length > 0 && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

        {!loading && stats && (<>
          {stats.pagosPendientes > 0 && (
            <AlertBanner color="orange"
              title={`${stats.pagosPendientes} pagos pendientes de validación`}
              description="Revisa los comprobantes y aprueba o rechaza"
              action={<button onClick={() => navigate('/admin/pagos')} className="btn-ghost text-xs py-1.5 px-3">Ver pagos →</button>} />
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total QRs"     value={stats.total}              sub={`${stats.bloqueados} bloqueados`}    icon={QrCode}       color="purple" className="stagger-1 fade-up" />
            <StatCard label="Vendidos"       value={stats.vendidos}           sub={`${stats.desbloqueados} activos`}   icon={CheckCircle2} color="green"  className="stagger-2 fade-up" />
            <StatCard label="Cobrado"        value={fmtMoney(stats.cobrado)}  sub="Pagos aprobados"                    icon={Banknote}     color="cyan"   className="stagger-3 fade-up" />
            <StatCard label="Por confirmar"  value={fmtMoney(stats.pendMonto)} sub="En revisión"                       icon={Clock}        color="orange" className="stagger-4 fade-up" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Vendor table */}
            <div className="xl:col-span-2">
              <Card>
                <CardHeader title="Vendedores activos" subtitle={`${vendedores.length} con QRs asignados`}
                  action={<button onClick={() => navigate('/admin/vendedores')} className="text-xs text-brand-violet font-semibold">Ver todos →</button>} />
                {vendedores.length === 0 ? (
                  <EmptyState icon="👥" title="Sin vendedores asignados" />
                ) : (
                  <table className="w-full tbl-dark">
                    <thead><tr><th>Vendedor</th><th>Asig.</th><th>Vendidos</th><th>Cobrado</th><th>Estado</th></tr></thead>
                    <tbody>
                      {vendedores.map(v => {
                        const color = v.vendidos === v.asignados ? 'from-brand-green to-brand-cyan' : v.pendiente > 0 ? 'from-brand-orange to-brand-red' : 'from-brand-purple to-brand-blue'
                        return (
                          <tr key={v.id} className="cursor-pointer" onClick={() => navigate(`/admin/vendedores/${v.id}`)}>
                            <td><div className="flex items-center gap-2.5"><Avatar name={v.nombre_completo} size="sm" /><span className="font-medium text-brand-text">{v.nombre_completo}</span></div></td>
                            <td className="text-brand-muted">{v.asignados}</td>
                            <td><div className="flex items-center gap-2"><span className="font-medium">{v.vendidos}</span><div className="w-16"><ProgressBar value={v.vendidos} max={v.asignados || 1} color={`bg-gradient-to-r ${color}`} /></div></div></td>
                            <td className="font-semibold text-brand-green">{fmtMoney(v.cobrado)}</td>
                            <td><Badge estado={v.pendiente > 0 ? 'pendiente' : 'aprobado'} label={v.pendiente > 0 ? 'Pendiente' : 'Al día'} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>

            {/* QR progress */}
            <div className="space-y-4">
              <Card>
                <CardHeader title="Estado de QRs" />
                <div className="p-4 space-y-3">
                  {[
                    { l: 'Bloqueados',     v: stats.bloqueados,     c: 'bg-brand-border' },
                    { l: 'Desbloqueados',  v: stats.desbloqueados,  c: 'bg-brand-orange' },
                    { l: 'Vendidos',       v: stats.vendidos,       c: 'bg-gradient-to-r from-brand-purple to-brand-blue' },
                    { l: 'Entregados',     v: stats.entregados,     c: 'bg-gradient-to-r from-brand-green to-brand-cyan' },
                  ].map(row => (
                    <div key={row.l}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-brand-muted">{row.l}</span>
                        <span className="font-semibold text-brand-text">{row.v}</span>
                      </div>
                      <ProgressBar value={row.v} max={stats.total || 1} color={row.c} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardHeader title="Financiero" />
                <div className="divide-y divide-brand-border/50">
                  {[
                    { l: 'Total cobrado',  v: fmtMoney(stats.cobrado),   c: 'text-brand-green' },
                    { l: 'En revisión',    v: fmtMoney(stats.pendMonto), c: 'text-brand-orange' },
                  ].map(row => (
                    <div key={row.l} className="flex justify-between items-center px-4 py-3 text-sm">
                      <span className="text-brand-muted">{row.l}</span>
                      <span className={`font-bold ${row.c}`}>{row.v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>)}
      </div>
    </div>
  )
}
