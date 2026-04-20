import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fmtMoney, fmtDate, calcComision } from '../../lib/utils'
import { Badge, ProgressBar, Spinner, EmptyState } from '../../components/shared/UI'

export default function VendorBalance() {
  const { profile } = useAuth()
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [qrs, pagos, evs] = await Promise.all([
      supabase.from('qr_codes').select('*, eventos(nombre,precio_boleta,comision_tipo,comision_valor)').eq('vendedor_id', profile.id),
      supabase.from('pagos').select('*, eventos(nombre)').eq('vendedor_id', profile.id).order('fecha_reporte', { ascending: false }),
      supabase.from('eventos').select('id,nombre,precio_boleta,comision_tipo,comision_valor'),
    ])
    const q = qrs.data || [], p = pagos.data || []

    const asignados  = q.length
    const vendidos   = q.filter(x => ['vendido','entregado'].includes(x.estado)).length
    const cobrado    = p.filter(x => x.estado === 'aprobado').reduce((s, x) => s + Number(x.monto), 0)
    const pendiente  = p.filter(x => x.estado === 'pendiente').reduce((s, x) => s + Number(x.monto), 0)

    // Comisión total ganada
    let comisionTotal = 0
    const eventoIds = [...new Set(q.map(x => x.evento_id))]
    eventoIds.forEach(eid => {
      const ev = evs.data?.find(e => e.id === eid)
      if (!ev) return
      const vendidosEv = q.filter(x => x.evento_id === eid && ['vendido','entregado'].includes(x.estado)).length
      const pagosCobradosEv = p.filter(x => x.evento_id === eid && x.estado === 'aprobado').reduce((s, x) => s + Number(x.monto), 0)
      if (ev.comision_tipo === 'fijo') comisionTotal += vendidosEv * (ev.comision_valor || 0)
      else if (ev.comision_tipo === 'porcentaje') comisionTotal += Math.round(pagosCobradosEv * ev.comision_valor / 100)
    })

    // Por evento
    const porEvento = eventoIds.map(eid => {
      const ev = evs.data?.find(e => e.id === eid)
      const mis = q.filter(x => x.evento_id === eid)
      const misPagos = p.filter(x => x.evento_id === eid)
      const vend = mis.filter(x => ['vendido','entregado'].includes(x.estado)).length
      const cob = misPagos.filter(x => x.estado === 'aprobado').reduce((s, x) => s + Number(x.monto), 0)
      let com = 0
      if (ev?.comision_tipo === 'fijo') com = vend * (ev.comision_valor || 0)
      else if (ev?.comision_tipo === 'porcentaje') com = Math.round(cob * (ev?.comision_valor || 0) / 100)
      return { nombre: ev?.nombre || 'Evento', asignados: mis.length, vendidos: vend, cobrado: cob, comision: com }
    })

    setData({ asignados, vendidos, cobrado, pendiente, comisionTotal, pagos: p, porEvento })
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!data) return <EmptyState icon="📊" title="Sin datos" />

  const alDia = data.pendiente === 0

  return (
    <div className="px-4 py-4">
      {/* Hero */}
      <div className="rounded-apple-xl p-5 text-white mb-4"
        style={{ background: alDia ? 'linear-gradient(135deg,#10B981,#06B6D4)' : 'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>
        <p className="text-[10px] font-semibold opacity-70 uppercase tracking-widest mb-1">Balance total</p>
        <p className="text-[38px] font-bold tracking-tight leading-none">{fmtMoney(data.cobrado)}</p>
        <p className="text-sm opacity-75 mt-1">cobrado y aprobado</p>
        <div className="mt-4 flex justify-between text-sm">
          <div>
            <p className="opacity-65 text-[11px]">En revisión</p>
            <p className="font-semibold">{fmtMoney(data.pendiente)}</p>
          </div>
          <div>
            <p className="opacity-65 text-[11px]">Comisión ganada</p>
            <p className="font-semibold">{fmtMoney(data.comisionTotal)}</p>
          </div>
          <div className="self-end px-3 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.2)' }}>
            {alDia ? '✓ Al día' : `${data.pagos.filter(p => p.estado === 'pendiente').length} pend.`}
          </div>
        </div>
      </div>

      {/* Per event */}
      {data.porEvento.map(ev => (
        <div key={ev.nombre} className="glass-card-light p-4 mb-3">
          <p className="font-semibold text-sm text-brand-text mb-3">🎟 {ev.nombre}</p>
          {[
            { l: 'Asignados', v: ev.asignados, max: ev.asignados, c: 'bg-brand-purple' },
            { l: 'Vendidos',  v: ev.vendidos,  max: ev.asignados, c: 'bg-gradient-to-r from-brand-purple to-brand-blue' },
          ].map(row => (
            <div key={row.l} className="mb-2 last:mb-0">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-brand-muted">{row.l}</span>
                <span className="font-semibold text-brand-text">{row.v}<span className="text-brand-subtle font-normal"> / {row.max}</span></span>
              </div>
              <ProgressBar value={row.v} max={row.max || 1} color={row.c} />
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-brand-border/30 flex justify-between text-sm">
            <div><span className="text-brand-muted">Cobrado</span><span className="font-bold text-brand-green ml-2">{fmtMoney(ev.cobrado)}</span></div>
            {ev.comision > 0 && <div><span className="text-brand-muted">Comisión</span><span className="font-bold text-brand-cyan ml-2">{fmtMoney(ev.comision)}</span></div>}
          </div>
        </div>
      ))}

      {/* Payment history */}
      <p className="text-xs font-semibold text-brand-subtle uppercase tracking-wider mb-2 mt-2">Historial de pagos</p>
      {data.pagos.length === 0 ? (
        <EmptyState icon="💸" title="Sin pagos" description="Aquí aparecerán tus pagos reportados" />
      ) : (
        <div className="space-y-2">
          {data.pagos.map(p => (
            <div key={p.id} className="glass-card-light p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center text-base',
                  p.estado === 'aprobado' ? 'bg-brand-green/10' : p.estado === 'rechazado' ? 'bg-brand-red/10' : 'bg-brand-orange/10')}>
                  {p.estado === 'aprobado' ? '✅' : p.estado === 'rechazado' ? '❌' : '⏳'}
                </div>
                <div>
                  <p className="font-semibold text-[14px] text-brand-text">{fmtMoney(p.monto)}</p>
                  <p className="text-[11px] text-brand-muted">{p.banco_destino} · {fmtDate(p.fecha_reporte)}</p>
                  <p className="text-[10px] text-brand-subtle">{p.eventos?.nombre}</p>
                </div>
              </div>
              <Badge estado={p.estado} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
