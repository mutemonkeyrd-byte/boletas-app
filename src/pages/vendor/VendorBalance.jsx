import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fmtMoney, fmtDate, comisionPorQR, depositoPorQR } from '../../lib/utils'
import { Badge, ProgressBar, Spinner, EmptyState } from '../../components/shared/UI'
import clsx from 'clsx'

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
    const desbloqueados = q.filter(x => x.estado === 'desbloqueado').length
    const vendidos   = q.filter(x => ['vendido','entregado'].includes(x.estado)).length
    const cobrado    = p.filter(x => x.estado === 'aprobado').reduce((s, x) => s + Number(x.monto), 0)
    const pendiente  = p.filter(x => x.estado === 'pendiente').reduce((s, x) => s + Number(x.monto), 0)

    // Por evento + totales
    let comisionTotal = 0
    let depositoEsperadoTotal = 0
    const eventoIds = [...new Set(q.map(x => x.evento_id))]
    const porEvento = eventoIds.map(eid => {
      const ev = evs.data?.find(e => e.id === eid)
      const mis = q.filter(x => x.evento_id === eid)
      const misPagos = p.filter(x => x.evento_id === eid)
      const desblQR = mis.filter(x => x.estado === 'desbloqueado').length
      const vend = mis.filter(x => x.estado === 'vendido').length
      const entregados = mis.filter(x => x.estado === 'entregado').length
      const realizados = desblQR + vend + entregados
      const cob = misPagos.filter(x => x.estado === 'aprobado').reduce((s, x) => s + Number(x.monto), 0)
      const pen = misPagos.filter(x => x.estado === 'pendiente').reduce((s, x) => s + Number(x.monto), 0)

      const comisionUnit = comisionPorQR(ev)
      const depositoUnit = depositoPorQR(ev)
      const com = realizados * comisionUnit
      const depositoEsp = realizados * depositoUnit
      const debe = Math.max(0, depositoEsp - cob - pen)

      comisionTotal += com
      depositoEsperadoTotal += depositoEsp

      return {
        nombre: ev?.nombre || 'Evento',
        asignados: mis.length,
        vendidos: realizados,
        precio: ev?.precio_boleta || 0,
        comisionUnit,
        depositoUnit,
        cobrado: cob,
        pendiente: pen,
        depositoEsperado: depositoEsp,
        debe,
        comision: com,
      }
    })

    const porDepositar = Math.max(0, depositoEsperadoTotal - cobrado - pendiente)

    setData({ asignados, vendidos, desbloqueados, cobrado, pendiente, porDepositar, depositoEsperadoTotal, comisionTotal, pagos: p, porEvento })
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!data) return <EmptyState icon="📊" title="Sin datos" />

  const alDia = data.porDepositar === 0 && data.pendiente === 0

  return (
    <div className="px-4 py-4">
      {/* Hero */}
      <div className="rounded-apple-xl p-5 text-white mb-4"
        style={{ background: alDia ? 'linear-gradient(135deg,#10B981,#06B6D4)' : data.porDepositar > 0 ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : 'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>
        <p className="text-[10px] font-semibold opacity-70 uppercase tracking-widest mb-1">{data.porDepositar > 0 ? 'Debes depositar' : 'Balance total'}</p>
        <p className="text-[38px] font-bold tracking-tight leading-none">{fmtMoney(data.porDepositar > 0 ? data.porDepositar : data.cobrado)}</p>
        <p className="text-sm opacity-75 mt-1">{data.porDepositar > 0 ? 'pendiente al admin' : 'cobrado y aprobado'}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="opacity-65 text-[10px]">Aprobado</p>
            <p className="font-semibold">{fmtMoney(data.cobrado)}</p>
          </div>
          <div>
            <p className="opacity-65 text-[10px]">En revisión</p>
            <p className="font-semibold">{fmtMoney(data.pendiente)}</p>
          </div>
          <div>
            <p className="opacity-65 text-[10px]">Comisión</p>
            <p className="font-semibold">{fmtMoney(data.comisionTotal)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] opacity-70">{data.vendidos} ticket{data.vendidos !== 1 ? 's' : ''} vendido{data.vendidos !== 1 ? 's' : ''}</span>
          <div className="px-3 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.2)' }}>
            {alDia ? '✓ Al día' : data.porDepositar > 0 ? '⚠️ Reporta pago' : `${data.pagos.filter(p => p.estado === 'pendiente').length} pend.`}
          </div>
        </div>
      </div>

      {/* Per event */}
      {data.porEvento.map(ev => (
        <div key={ev.nombre} className="glass-card-light p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm text-brand-text">🎟 {ev.nombre}</p>
            <span className="text-[10px] text-brand-subtle">{fmtMoney(ev.precio)}/ticket</span>
          </div>
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
          <div className="mt-3 pt-3 border-t border-brand-border/30 grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-brand-muted block">Esperado</span><span className="font-bold text-brand-text">{fmtMoney(ev.depositoEsperado)}</span></div>
            <div><span className="text-brand-muted block">Cobrado</span><span className="font-bold text-brand-green">{fmtMoney(ev.cobrado)}</span></div>
            {ev.pendiente > 0 && <div><span className="text-brand-muted block">En revisión</span><span className="font-bold text-brand-orange">{fmtMoney(ev.pendiente)}</span></div>}
            {ev.comision > 0 && <div><span className="text-brand-muted block">Comisión</span><span className="font-bold text-brand-cyan">{fmtMoney(ev.comision)}</span></div>}
          </div>
          {ev.debe > 0 && (
            <div className="mt-2 rounded-xl p-2 text-center text-xs font-semibold"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}>
              ⚠️ Debes depositar {fmtMoney(ev.debe)} más al admin
            </div>
          )}
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
