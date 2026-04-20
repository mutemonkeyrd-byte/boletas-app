import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { fmtDate, fmtMoney } from '../../lib/utils'
import { Card, CardHeader, Badge, Avatar, InfoRow, EmptyState, Spinner, AlertBanner, showToast } from '../../components/shared/UI'
import { CheckCircle, XCircle, Phone, Mail, Calendar } from 'lucide-react'
import clsx from 'clsx'

export default function AdminVendedores() {
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('todos')
  const [selected, setSelected]     = useState(null)
  const [detail, setDetail]         = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('rol', 'vendedor').order('created_at', { ascending: false })
    setVendedores(data || [])
    setLoading(false)
  }

  async function loadDetail(id) {
    setLoadingDetail(true)
    const [qrs, pagos] = await Promise.all([
      supabase.from('qr_codes').select('*, eventos(nombre)').eq('vendedor_id', id),
      supabase.from('pagos').select('*, eventos(nombre)').eq('vendedor_id', id).order('fecha_reporte', { ascending: false }),
    ])
    const q = qrs.data || [], p = pagos.data || []
    setDetail({
      qrs: q, pagos: p,
      stats: {
        asignados: q.length,
        vendidos: q.filter(x => ['vendido','entregado'].includes(x.estado)).length,
        cobrado: p.filter(x => x.estado === 'aprobado').reduce((s, x) => s + Number(x.monto), 0),
        pendiente: p.filter(x => x.estado === 'pendiente').reduce((s, x) => s + Number(x.monto), 0),
      }
    })
    setLoadingDetail(false)
  }

  async function updateEstado(id, estado) {
    await supabase.from('profiles').update({ estado }).eq('id', id)
    showToast(estado === 'aprobado' ? '✓ Vendedor aprobado' : 'Vendedor rechazado', estado === 'aprobado' ? 'success' : 'error')
    load()
    if (selected?.id === id) setSelected(p => ({ ...p, estado }))
  }

  function handleSelect(v) { setSelected(v); loadDetail(v.id) }

  const filtered = filter === 'todos' ? vendedores : vendedores.filter(v => v.estado === filter)
  const pendientes = vendedores.filter(v => v.estado === 'pendiente').length

  const badgeCls = { aprobado: 'badge-green', pendiente: 'badge-orange', rechazado: 'badge-red' }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-brand-border/50 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)' }}>
        <div>
          <h1 className="text-[22px] font-bold text-brand-text">Vendedores</h1>
          <p className="text-xs text-brand-muted">{vendedores.length} registrados</p>
        </div>
      </div>

      <div className="p-6 flex gap-5 h-[calc(100vh-73px)] overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {pendientes > 0 && (
            <AlertBanner color="orange"
              title={`${pendientes} solicitudes pendientes de aprobación`}
              description="Revisa y aprueba o rechaza a los nuevos vendedores" />
          )}

          <div className="flex gap-2 mb-4 flex-wrap">
            {[{ v: 'todos', l: 'Todos' }, { v: 'pendiente', l: '⏳ Pendientes' }, { v: 'aprobado', l: '✅ Aprobados' }, { v: 'rechazado', l: '❌ Rechazados' }].map(f => (
              <button key={f.v} onClick={() => setFilter(f.v)}
                className={clsx('px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                  filter === f.v ? 'text-white' : 'text-brand-muted')}
                style={filter === f.v ? { background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' } : { background: 'rgba(30,30,46,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                {f.l}
              </button>
            ))}
          </div>

          <Card className="flex-1 overflow-auto">
            {loading ? <div className="flex justify-center py-14"><Spinner size="lg" /></div>
              : filtered.length === 0 ? <EmptyState icon="👥" title="Sin vendedores" />
              : (
              <table className="w-full tbl-dark">
                <thead><tr><th>Vendedor</th><th>Teléfono</th><th>Registro</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id}
                      className={clsx('cursor-pointer', selected?.id === v.id && '!bg-brand-purple/5')}
                      onClick={() => handleSelect(v)}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={v.nombre_completo} size="sm" />
                          <div>
                            <p className="font-medium text-brand-text">{v.nombre_completo}</p>
                            <p className="text-[11px] text-brand-subtle">{v.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-brand-muted">{v.telefono || '—'}</td>
                      <td className="text-brand-muted">{fmtDate(v.created_at)}</td>
                      <td><span className={`badge ${badgeCls[v.estado] || 'badge-muted'}`}>{v.estado}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        {v.estado === 'pendiente' && (
                          <div className="flex gap-2">
                            <button onClick={() => updateEstado(v.id, 'aprobado')} className="flex items-center gap-1 text-xs text-brand-green font-semibold hover:underline"><CheckCircle size={12} />Aprobar</button>
                            <button onClick={() => updateEstado(v.id, 'rechazado')} className="flex items-center gap-1 text-xs text-brand-red font-semibold hover:underline"><XCircle size={12} />Rechazar</button>
                          </div>
                        )}
                        {v.estado === 'rechazado' && (
                          <button onClick={() => updateEstado(v.id, 'aprobado')} className="text-xs text-brand-violet font-semibold hover:underline">Aprobar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Detail panel */}
        <div className="w-[272px] flex-shrink-0 overflow-y-auto">
          {selected ? (
            <div className="glass-card p-5 fade-up">
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={selected.nombre_completo} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-brand-text leading-tight">{selected.nombre_completo}</p>
                  <span className={`badge ${badgeCls[selected.estado] || 'badge-muted'} mt-1 text-[10px]`}>{selected.estado}</span>
                </div>
              </div>

              <InfoRow label={<span className="flex items-center gap-1.5"><Phone size={11} />Tel</span>} value={selected.telefono || '—'} />
              <InfoRow label={<span className="flex items-center gap-1.5"><Mail size={11} />Email</span>} value={<span className="text-[11px] break-all">{selected.email || '—'}</span>} />
              <InfoRow label={<span className="flex items-center gap-1.5"><Calendar size={11} />Registro</span>} value={fmtDate(selected.created_at)} />

              {selected.estado === 'pendiente' && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => updateEstado(selected.id, 'aprobado')} className="btn-success flex-1 text-xs py-2">
                    <CheckCircle size={12} /> Aprobar
                  </button>
                  <button onClick={() => updateEstado(selected.id, 'rechazado')} className="btn-danger flex-1 text-xs py-2">
                    <XCircle size={12} /> Rechazar
                  </button>
                </div>
              )}

              {loadingDetail ? <div className="flex justify-center py-6"><Spinner /></div>
                : detail ? (
                <div className="mt-4">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { l: 'QRs asign.', v: detail.stats.asignados, c: 'text-brand-violet' },
                      { l: 'Vendidos',  v: detail.stats.vendidos,  c: 'text-brand-green' },
                      { l: 'Cobrado',   v: fmtMoney(detail.stats.cobrado), c: 'text-brand-green' },
                      { l: 'Pendiente', v: fmtMoney(detail.stats.pendiente), c: 'text-brand-orange' },
                    ].map(item => (
                      <div key={item.l} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(30,30,46,0.5)' }}>
                        <p className={`text-[15px] font-bold ${item.c}`}>{item.v}</p>
                        <p className="text-[10px] text-brand-subtle mt-0.5">{item.l}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold text-brand-subtle uppercase tracking-widest mb-2">Últimos pagos</p>
                  {detail.pagos.slice(0, 3).map(p => (
                    <div key={p.id} className="rounded-xl px-3 py-2.5 mb-1.5 flex justify-between items-center" style={{ background: 'rgba(30,30,46,0.5)' }}>
                      <div><p className="text-xs font-semibold text-brand-text">{fmtMoney(p.monto)}</p>
                        <p className="text-[10px] text-brand-subtle">{p.banco_destino} · {fmtDate(p.fecha_reporte)}</p></div>
                      <Badge estado={p.estado} />
                    </div>
                  ))}
                  {detail.pagos.length === 0 && <p className="text-xs text-brand-subtle text-center py-2">Sin pagos aún</p>}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="glass-card p-6 flex flex-col items-center justify-center h-48 text-center">
              <span className="text-3xl mb-2 opacity-30">👤</span>
              <p className="text-sm font-medium text-brand-text">Selecciona un vendedor</p>
              <p className="text-xs text-brand-muted mt-1">para ver su perfil</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
