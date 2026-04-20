import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { syncQR } from '../../lib/sheets'
import { fmtMoney } from '../../lib/utils'
import { Badge, UnlockWarningModal, EmptyState, Spinner, showToast } from '../../components/shared/UI'
import { Lock, Unlock, AlertTriangle, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export default function VendorQRs() {
  const { profile } = useAuth()
  const [qrs, setQrs]           = useState([])
  const [eventos, setEventos]   = useState([])
  const [eventoId, setEventoId] = useState('')
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('todos')
  const [warningOpen, setWarningOpen] = useState(false)
  const [selectedQR, setSelectedQR]  = useState(null)
  const [unlocking, setUnlocking]    = useState(false)

  useEffect(() => { loadEventos() }, [])
  useEffect(() => { if (eventoId) loadQRs() }, [eventoId, filter])

  async function loadEventos() {
    const { data } = await supabase
      .from('eventos').select('id,nombre,precio_boleta,comision_tipo,comision_valor')
      .order('created_at', { ascending: false })
    setEventos(data || [])
    if (data?.length) setEventoId(data[0].id)
    else setLoading(false)
  }

  async function loadQRs() {
    setLoading(true)
    let q = supabase.from('qr_codes').select('*, eventos(nombre,precio_boleta,comision_tipo,comision_valor)')
      .eq('vendedor_id', profile.id).eq('evento_id', eventoId).order('created_at')
    if (filter !== 'todos') q = q.eq('estado', filter)
    const { data } = await q
    setQrs(data || [])
    setLoading(false)
  }

  function handleUnlockPress(qr) {
    setSelectedQR(qr)
    setWarningOpen(true)
  }

  async function confirmUnlock() {
    if (!selectedQR) return
    setWarningOpen(false)
    setUnlocking(true)
    const { error } = await supabase.from('qr_codes').update({
      estado: 'desbloqueado',
      fecha_desbloqueo: new Date().toISOString(),
    }).eq('id', selectedQR.id)

    if (error) { showToast('Error al desbloquear', 'error'); setUnlocking(false); return }
    syncQR({ qr_id: selectedQR.qr_id, estado: 'desbloqueado', vendedor_nombre: profile.nombre_completo })
    showToast('🔓 QR desbloqueado — notifica el pago ahora', 'info')
    setSelectedQR(null)
    setUnlocking(false)
    loadQRs()
  }

  const ev = eventos.find(e => e.id === eventoId)
  const stats = {
    bloqueados:    qrs.filter(q => q.estado === 'bloqueado').length,
    desbloqueados: qrs.filter(q => q.estado === 'desbloqueado').length,
    vendidos:      qrs.filter(q => q.estado === 'vendido').length,
    entregados:    qrs.filter(q => q.estado === 'entregado').length,
  }

  const FILTERS = [
    { v: 'todos', l: 'Todos' },
    { v: 'bloqueado', l: '🔒 Bloqueados' },
    { v: 'desbloqueado', l: '🔓 Activos' },
    { v: 'vendido', l: '✅ Vendidos' },
  ]

  return (
    <div className="px-4 py-4">
      {/* Event selector */}
      {eventos.length > 1 && (
        <select className="select-dark text-sm mb-4" value={eventoId} onChange={e => setEventoId(e.target.value)}>
          {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
        </select>
      )}

      {/* Evento info */}
      {ev && (
        <div className="glass-card-light p-4 mb-4">
          <p className="font-semibold text-brand-text text-sm mb-2">🎟 {ev.nombre}</p>
          <div className="flex gap-4 text-xs text-brand-muted">
            <span>💰 Precio: <strong className="text-brand-green">{fmtMoney(ev.precio_boleta)}</strong></span>
            <span>🎯 Comisión: <strong className="text-brand-cyan">
              {ev.comision_valor ? (ev.comision_tipo === 'porcentaje' ? `${ev.comision_valor}%` : fmtMoney(ev.comision_valor)) : '—'}
            </strong></span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { l: 'Bloqueados', v: stats.bloqueados,    c: 'text-brand-muted' },
          { l: 'Activos',    v: stats.desbloqueados, c: 'text-brand-orange' },
          { l: 'Vendidos',   v: stats.vendidos,      c: 'text-brand-green' },
          { l: 'Entregados', v: stats.entregados,    c: 'text-brand-cyan' },
        ].map(s => (
          <div key={s.l} className="glass-card-light p-2 text-center">
            <p className={`text-lg font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[9px] text-brand-subtle mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Alert for unlocked QRs without payment */}
      {stats.desbloqueados > 0 && (
        <div className="rounded-xl p-3 mb-4 flex items-start gap-2.5"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertTriangle size={16} className="text-brand-orange flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand-orange">
              {stats.desbloqueados} QR{stats.desbloqueados > 1 ? 's activos' : ' activo'} sin pago reportado
            </p>
            <p className="text-xs text-brand-muted mt-0.5">Ve a la tab de Pagos y notifica la transferencia</p>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={clsx('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
              filter === f.v ? 'text-white' : 'text-brand-muted')}
            style={filter === f.v
              ? { background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' }
              : { background: 'rgba(30,30,46,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {f.l}
          </button>
        ))}
      </div>

      {/* QR List */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : qrs.length === 0 ? (
        <EmptyState icon="🔲" title="Sin QRs asignados" description="El administrador te asignará códigos QR pronto" />
      ) : (
        <div className="space-y-2">
          {qrs.map(qr => {
            const locked      = qr.estado === 'bloqueado'
            const unlocked    = qr.estado === 'desbloqueado'
            const sold        = qr.estado === 'vendido'
            const delivered   = qr.estado === 'entregado'

            return (
              <div key={qr.id} className={clsx(
                'glass-card-light p-4 transition-all duration-200',
                unlocked && 'border-brand-orange/40',
                delivered && 'border-brand-green/30',
              )}>
                <div className="flex items-center gap-3">
                  {/* QR Thumbnail */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white flex-shrink-0">
                    {qr.qr_image_url ? (
                      <img src={qr.qr_image_url} alt="QR"
                        className={clsx('w-full h-full object-contain transition-all duration-700',
                          locked ? 'qr-locked' : 'qr-unlocked')} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-surface">
                        <span className="text-xl">🎟</span>
                      </div>
                    )}
                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(10,10,15,0.5)' }}>
                        <Lock size={16} className="text-brand-violet" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-brand-text">
                        {locked ? 'QR Bloqueado' : `QR ${unlocked ? 'Activo ⚡' : sold ? 'Vendido ✓' : 'Entregado ✓'}`}
                      </p>
                      <Badge estado={qr.estado} />
                    </div>
                    <p className="text-[10px] font-mono text-brand-subtle truncate">
                      {locked ? '•••••••••••••••••' : qr.qr_id}
                    </p>
                    {unlocked && (
                      <p className="text-[10px] text-brand-orange mt-0.5 font-semibold">⚠️ Reporta el pago ahora</p>
                    )}
                  </div>

                  {/* Action */}
                  {locked && (
                    <button onClick={() => handleUnlockPress(qr)} disabled={unlocking}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl transition-all active:scale-95"
                      style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#8B5CF6' }}>
                      <Unlock size={12} /> Desbloquear
                    </button>
                  )}
                </div>

                {/* Expanded QR for unlocked */}
                {unlocked && qr.qr_image_url && (
                  <div className="mt-3 pt-3 border-t border-brand-border/30">
                    <p className="text-xs text-brand-muted mb-2 text-center">Muestra este QR a tu cliente:</p>
                    <div className="flex justify-center">
                      <div className="w-48 h-48 bg-white rounded-xl overflow-hidden p-1">
                        <img src={qr.qr_image_url} alt="QR" className="w-full h-full object-contain" />
                      </div>
                    </div>
                    <div className="mt-2 rounded-xl p-2 text-center text-[10px] text-brand-orange"
                      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      ⚡ QR activo — reporta el pago en la tab de Pagos
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Unlock warning modal */}
      <UnlockWarningModal
        open={warningOpen}
        onClose={() => { setWarningOpen(false); setSelectedQR(null) }}
        onConfirm={confirmUnlock}
      />
    </div>
  )
}
