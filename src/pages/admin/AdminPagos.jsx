import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtMoney, fmtDate, fmtDateTime, comisionPorQR, depositoPorQR } from '../../lib/utils'
import { syncPago } from '../../lib/sheets'
import { Card, Badge, Avatar, InfoRow, EmptyState, Spinner, showToast } from '../../components/shared/UI'
import { CheckCircle, XCircle, ZoomIn, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

export default function AdminPagos() {
  const { profile } = useAuth()
  const [pagos, setPagos]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('pendiente')
  const [selected, setSelected] = useState(null)
  const [notas, setNotas]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [voucherUrl, setVoucherUrl] = useState(null)
  const [zoom, setZoom]         = useState(false)

  useEffect(() => { load() }, [filter])

  // Realtime: refresh when pagos table changes
  useEffect(() => {
    const ch = supabase.channel('admin-pagos-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function load() {
    setLoading(true)
    let q = supabase.from('pagos')
      .select('*, profiles!pagos_vendedor_id_fkey(nombre_completo,telefono), eventos(nombre,precio_boleta,comision_tipo,comision_valor)')
      .order('fecha_reporte', { ascending: false })
    if (filter) q = q.eq('estado', filter)
    const { data, error } = await q
    if (error) console.error('Error loading pagos:', error)
    setPagos(data || [])
    setLoading(false)
  }

  async function selectPago(pago) {
    setSelected(pago); setNotas(pago.notas_admin || ''); setVoucherUrl(null)
    if (pago.comprobante_url) {
      const { data } = await supabase.storage.from('comprobantes').createSignedUrl(pago.comprobante_url, 3600)
      setVoucherUrl(data?.signedUrl || null)
    }
  }

  async function validar(estado) {
    if (!selected) return
    setSaving(true)
    await supabase.from('pagos').update({
      estado, notas_admin: notas,
      revisado_por: profile.id,
      fecha_revision: new Date().toISOString(),
    }).eq('id', selected.id)

    // Update QR statuses
    if (estado === 'aprobado') {
      await supabase.from('qr_codes').update({ estado: 'vendido' })
        .eq('evento_id', selected.evento_id)
        .in('qr_id', selected.qr_ids || [])
    } else if (estado === 'rechazado') {
      // QRs stay desbloqueado — vendedor must re-report
    }

    syncPago({ ...selected, estado, notas_admin: notas, vendedor_nombre: selected.profiles?.nombre_completo })
    showToast(estado === 'aprobado' ? '✓ Pago aprobado' : 'Pago rechazado', estado === 'aprobado' ? 'success' : 'error')
    setSaving(false); setSelected(null); load()
  }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-brand-border/50 px-6 py-4"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)' }}>
        <h1 className="text-[22px] font-bold text-brand-text">Pagos</h1>
        <p className="text-xs text-brand-muted">Validación de comprobantes de transferencia</p>
      </div>

      <div className="p-6 flex gap-5 h-[calc(100vh-73px)] overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex gap-2 mb-4 flex-wrap">
            {[{ v: 'pendiente', l: '⏳ Pendientes' }, { v: 'aprobado', l: '✅ Aprobados' }, { v: 'rechazado', l: '❌ Rechazados' }, { v: '', l: 'Todos' }].map(f => (
              <button key={f.v} onClick={() => { setFilter(f.v); setSelected(null) }}
                className={clsx('px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                  filter === f.v ? 'text-white' : 'text-brand-muted')}
                style={filter === f.v ? { background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' } : { background: 'rgba(30,30,46,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                {f.l}
              </button>
            ))}
          </div>

          <Card className="flex-1 overflow-auto">
            {loading ? <div className="flex justify-center py-14"><Spinner size="lg" /></div>
              : pagos.length === 0 ? <EmptyState icon="🧾" title="Sin pagos" description="No hay pagos en este estado" />
              : (
              <table className="w-full tbl-dark">
                <thead><tr><th>Vendedor</th><th>Evento</th><th>Monto</th><th>Banco</th><th>QRs</th><th>Fecha</th><th>Estado</th></tr></thead>
                <tbody>
                  {pagos.map(p => (
                    <tr key={p.id}
                      className={clsx('cursor-pointer', selected?.id === p.id && '!bg-brand-purple/5')}
                      onClick={() => selectPago(p)}>
                      <td><div className="flex items-center gap-2.5">
                        <Avatar name={p.profiles?.nombre_completo} size="sm" />
                        <span className="font-medium text-brand-text">{p.profiles?.nombre_completo}</span>
                      </div></td>
                      <td className="text-brand-muted text-xs">{p.eventos?.nombre}</td>
                      <td className="font-bold text-brand-violet">{fmtMoney(p.monto)}</td>
                      <td className="text-brand-muted">{p.banco_destino}</td>
                      <td>
                        <div className="flex flex-wrap gap-0.5">
                          {(p.qr_ids || []).slice(0, 3).map((id, i) => (
                            <span key={i} className="text-[9px] font-mono px-1 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.15)', color: '#8B5CF6' }}>
                              {String(id).slice(0, 6)}
                            </span>
                          ))}
                          {(p.qr_ids || []).length > 3 && <span className="text-[10px] text-brand-subtle">+{p.qr_ids.length - 3}</span>}
                        </div>
                      </td>
                      <td className="text-brand-muted text-xs">{fmtDate(p.fecha_reporte)}</td>
                      <td><Badge estado={p.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Detail */}
        <div className="w-[272px] flex-shrink-0 overflow-y-auto">
          {selected ? (
            <div className="glass-card p-5 fade-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[15px] text-brand-text">Detalle del pago</h3>
                <Badge estado={selected.estado} />
              </div>

              {/* Voucher */}
              <div className="rounded-xl h-44 flex flex-col items-center justify-center mb-4 cursor-pointer overflow-hidden relative group"
                style={{ background: 'rgba(30,30,46,0.5)', border: '2px dashed rgba(255,255,255,0.07)' }}
                onClick={() => voucherUrl && setZoom(true)}>
                {voucherUrl ? (
                  <>
                    <img src={voucherUrl} className="w-full h-full object-cover" alt="Comprobante" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.4)' }}>
                      <ZoomIn size={24} className="text-white" />
                    </div>
                  </>
                ) : selected.comprobante_url ? <Spinner /> : (
                  <><span className="text-3xl opacity-30">🧾</span><span className="text-xs text-brand-subtle mt-2">Sin comprobante</span></>
                )}
              </div>

              <InfoRow label="Vendedor" value={selected.profiles?.nombre_completo} />
              <InfoRow label="Evento" value={selected.eventos?.nombre} />
              <InfoRow label="Tickets" value={`${(selected.qr_ids || []).length}`} />
              <InfoRow label="Banco" value={selected.banco_destino} />
              <InfoRow label="Fecha" value={fmtDateTime(selected.fecha_reporte)} />

              {/* Math breakdown — Expected vs Reported */}
              {(() => {
                const ev = selected.eventos
                const cnt = (selected.qr_ids || []).length
                const precio = Number(ev?.precio_boleta || 0)
                const comUnit = comisionPorQR(ev)
                const depUnit = depositoPorQR(ev)
                const totalCobrado = cnt * precio
                const totalComision = cnt * comUnit
                const esperado = cnt * depUnit
                const reportado = Number(selected.monto)
                const diff = reportado - esperado
                if (precio === 0) return (
                  <InfoRow label="Monto" value={<span className="text-brand-violet font-bold">{fmtMoney(reportado)}</span>} />
                )
                return (
                  <div className="mt-3 rounded-xl p-3"
                    style={{
                      background: diff === 0 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                      border: `1px solid ${diff === 0 ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.3)'}`
                    }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                      style={{ color: diff === 0 ? '#10B981' : '#F59E0B' }}>
                      {diff === 0 ? '✓ Cuadre correcto' : diff > 0 ? '⚠️ Pagó de más' : '⚠️ Pagó de menos'}
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-brand-muted">{cnt} ticket{cnt !== 1 ? 's' : ''} × {fmtMoney(precio)}</span>
                        <span className="text-brand-text font-semibold">{fmtMoney(totalCobrado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-muted">– Comisión vendedor</span>
                        <span className="text-brand-cyan font-semibold">{fmtMoney(totalComision)}</span>
                      </div>
                      <div className="border-t border-brand-border/40 pt-1 mt-1 flex justify-between">
                        <span className="text-brand-text font-semibold">Esperado</span>
                        <span className="font-bold text-brand-text">{fmtMoney(esperado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-muted">Reportado</span>
                        <span className={clsx('font-bold', diff === 0 ? 'text-brand-green' : 'text-brand-orange')}>{fmtMoney(reportado)}</span>
                      </div>
                      {diff !== 0 && (
                        <div className="flex justify-between pt-1 border-t border-brand-border/40 mt-1">
                          <span className="text-brand-muted">Diferencia</span>
                          <span className="font-bold" style={{ color: diff > 0 ? '#10B981' : '#EF4444' }}>
                            {diff > 0 ? '+' : ''}{fmtMoney(diff)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              <InfoRow label="QR IDs" value={
                <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                  {(selected.qr_ids || []).slice(0, 6).map((id, i) => (
                    <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.15)', color: '#8B5CF6' }}>
                      {String(id).slice(0, 8)}
                    </span>
                  ))}
                  {(selected.qr_ids || []).length > 6 && (
                    <span className="text-[9px] text-brand-subtle">+{selected.qr_ids.length - 6}</span>
                  )}
                </div>
              } />

              {selected.estado === 'pendiente' && (
                <>
                  <label className="label-dark mt-4">Notas del admin</label>
                  <textarea className="input-dark resize-none text-xs mb-3" rows={2}
                    placeholder="Observaciones..." value={notas} onChange={e => setNotas(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => validar('aprobado')} disabled={saving} className="btn-success flex-1 text-xs py-2.5">
                      {saving ? '...' : <><CheckCircle size={13} /> Aprobar</>}
                    </button>
                    <button onClick={() => validar('rechazado')} disabled={saving} className="btn-danger flex-1 text-xs py-2.5">
                      <XCircle size={13} /> Rechazar
                    </button>
                  </div>
                </>
              )}
              {selected.estado !== 'pendiente' && (
                <div className={clsx('rounded-xl p-3 text-center text-sm font-semibold mt-2',
                  selected.estado === 'aprobado' ? 'text-brand-green' : 'text-brand-red')}
                  style={{ background: selected.estado === 'aprobado' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                  {selected.estado === 'aprobado' ? '✓ Pago aprobado' : '✕ Pago rechazado'}
                  {selected.notas_admin && <p className="text-xs font-normal mt-1 opacity-70">{selected.notas_admin}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-6 flex flex-col items-center justify-center h-56 text-center">
              <span className="text-3xl mb-2 opacity-30">🧾</span>
              <p className="text-sm font-medium text-brand-text">Selecciona un pago</p>
              <p className="text-xs text-brand-muted mt-1">para validar el comprobante</p>
            </div>
          )}
        </div>
      </div>

      {/* ZOOM */}
      {zoom && voucherUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setZoom(false)}>
          <img src={voucherUrl} className="max-w-full max-h-full rounded-xl object-contain" alt="Comprobante" />
        </div>
      )}
    </div>
  )
}
