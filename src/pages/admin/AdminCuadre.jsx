import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { fmtMoney } from '../../lib/utils'
import { Card, CardHeader, Avatar, ProgressBar, Spinner, EmptyState } from '../../components/shared/UI'
import { Banknote, Clock, TrendingUp } from 'lucide-react'

export default function AdminCuadre() {
  const [eventos, setEventos] = useState([])
  const [eventoId, setEventoId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadEventos() }, [])
  useEffect(() => { if (eventoId) loadCuadre() }, [eventoId])

  async function loadEventos() {
    const { data } = await supabase.from('eventos').select('id,nombre,comision_tipo,comision_valor,precio_boleta').order('created_at', { ascending: false })
    setEventos(data || [])
    if (data?.length) setEventoId(data[0].id)
    else setLoading(false)
  }

  async function loadCuadre() {
    setLoading(true)
    const ev = eventos.find(e => e.id === eventoId)
    const [qrs, pagos, profs] = await Promise.all([
      supabase.from('qr_codes').select('*').eq('evento_id', eventoId),
      supabase.from('pagos').select('*').eq('evento_id', eventoId),
      supabase.from('profiles').select('id,nombre_completo').eq('rol', 'vendedor').eq('estado', 'aprobado'),
    ])
    const q = qrs.data || [], p = pagos.data || [], vs = profs.data || []
    const totalCobrado = p.filter(x => x.estado === 'aprobado').reduce((s, x) => s + Number(x.monto), 0)
    const totalPend = p.filter(x => x.estado === 'pendiente').reduce((s, x) => s + Number(x.monto), 0)

    const bancos = {}
    p.filter(x => x.estado === 'aprobado').forEach(x => { bancos[x.banco_destino] = (bancos[x.banco_destino] || 0) + Number(x.monto) })

    const vendedores = vs.map(v => {
      const mis = q.filter(x => x.vendedor_id === v.id)
      const misPagos = p.filter(x => x.vendedor_id === v.id)
      const vendidos = mis.filter(x => ['vendido','entregado'].includes(x.estado)).length
      const cobrado = misPagos.filter(x => x.estado === 'aprobado').reduce((s, x) => s + Number(x.monto), 0)
      const pendiente = misPagos.filter(x => x.estado === 'pendiente').reduce((s, x) => s + Number(x.monto), 0)
      // Comision
      let comision = 0
      if (ev?.comision_tipo === 'porcentaje') comision = Math.round(cobrado * ev.comision_valor / 100)
      else if (ev?.comision_valor) comision = vendidos * (ev.comision_valor || 0)
      return { ...v, asignados: mis.length, vendidos, cobrado, pendiente, comision }
    }).filter(v => v.asignados > 0)

    setData({ totalCobrado, totalPend, bancos, vendedores })
    setLoading(false)
  }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-brand-border/50 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)' }}>
        <div>
          <h1 className="text-[22px] font-bold text-brand-text">Cuadre financiero</h1>
          <p className="text-xs text-brand-muted">Resumen de cobros y comisiones</p>
        </div>
        {eventos.length > 1 && (
          <select className="select-dark text-sm w-auto py-2 px-3" value={eventoId} onChange={e => setEventoId(e.target.value)}>
            {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
          </select>
        )}
      </div>

      <div className="p-6">
        {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          : !data ? <EmptyState icon="📊" title="Sin datos" />
          : (<>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {[
              { icon: Banknote, label: 'Total cobrado',  value: fmtMoney(data.totalCobrado), sub: 'Pagos aprobados',      color: 'from-brand-green to-brand-cyan', text: 'text-brand-green' },
              { icon: Clock,    label: 'En revisión',    value: fmtMoney(data.totalPend),    sub: 'Pendiente aprobación',  color: 'from-brand-orange to-brand-red', text: 'text-brand-orange' },
              { icon: TrendingUp, label: 'Total esperado', value: fmtMoney(data.totalCobrado + data.totalPend), sub: 'Cobrado + revisión', color: 'from-brand-purple to-brand-blue', text: 'text-brand-violet' },
            ].map(item => (
              <div key={item.label} className="glass-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${item.color} opacity-80`}>
                    <item.icon size={16} className="text-white" />
                  </div>
                  <p className="text-xs font-semibold text-brand-subtle uppercase tracking-wide">{item.label}</p>
                </div>
                <p className={`text-3xl font-bold tracking-tight ${item.text}`}>{item.value}</p>
                <p className="text-xs text-brand-subtle mt-1">{item.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <Card>
                <CardHeader title="Por vendedor" subtitle="Cobros y comisiones" />
                <table className="w-full tbl-dark">
                  <thead><tr><th>Vendedor</th><th>Asig.</th><th>Vendidos</th><th>Cobrado</th><th>En revisión</th><th>Comisión</th></tr></thead>
                  <tbody>
                    {data.vendedores.map(v => (
                      <tr key={v.id}>
                        <td><div className="flex items-center gap-2.5"><Avatar name={v.nombre_completo} size="sm" /><span className="font-medium text-brand-text">{v.nombre_completo}</span></div></td>
                        <td className="text-brand-muted">{v.asignados}</td>
                        <td><div className="flex items-center gap-2"><span className="font-medium">{v.vendidos}</span>
                          <div className="w-14"><ProgressBar value={v.vendidos} max={v.asignados || 1} /></div></div></td>
                        <td className="font-bold text-brand-green">{fmtMoney(v.cobrado)}</td>
                        <td className={v.pendiente > 0 ? 'font-semibold text-brand-orange' : 'text-brand-subtle'}>{v.pendiente > 0 ? fmtMoney(v.pendiente) : '—'}</td>
                        <td className="font-bold text-brand-cyan">{v.comision > 0 ? fmtMoney(v.comision) : '—'}</td>
                      </tr>
                    ))}
                    {data.vendedores.length === 0 && <tr><td colSpan={6} className="text-center text-brand-subtle py-8">Sin datos</td></tr>}
                  </tbody>
                </table>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader title="Por banco" />
                <div className="divide-y divide-brand-border/30">
                  {Object.entries(data.bancos).length === 0
                    ? <p className="text-sm text-brand-subtle text-center py-6">Sin pagos aprobados</p>
                    : Object.entries(data.bancos).map(([banco, monto]) => (
                    <div key={banco} className="flex justify-between items-center px-4 py-3">
                      <span className="text-sm text-brand-text">🏦 {banco}</span>
                      <span className="font-bold text-brand-green text-sm">{fmtMoney(monto)}</span>
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
