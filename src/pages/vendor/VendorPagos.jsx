import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { syncPago } from '../../lib/sheets'
import { fmtMoney, fmtDate } from '../../lib/utils'
import { Badge, EmptyState, Spinner, showToast } from '../../components/shared/UI'
import { Camera, X, ChevronLeft, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

export default function VendorPagos() {
  const { profile } = useAuth()
  const [qrsActivos, setQrsActivos] = useState([])
  const [pagos, setPagos]           = useState([])
  const [eventos, setEventos]       = useState([])
  const [eventoId, setEventoId]     = useState('')
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState('list')
  const [selQRs, setSelQRs]         = useState([])
  const [monto, setMonto]           = useState('')
  const [banco, setBanco]           = useState('')
  const [file, setFile]             = useState(null)
  const [preview, setPreview]       = useState(null)
  const [saving, setSaving]         = useState(false)
  const fileRef = useRef()

  useEffect(() => { load() }, [])

  async function load() {
    const [qrs, p, ev] = await Promise.all([
      supabase.from('qr_codes').select('*, eventos(nombre,cuentas_bancarias)')
        .eq('vendedor_id', profile.id).eq('estado', 'desbloqueado'),
      supabase.from('pagos').select('*, eventos(nombre)')
        .eq('vendedor_id', profile.id).order('fecha_reporte', { ascending: false }),
      supabase.from('eventos').select('id,nombre,cuentas_bancarias').order('created_at', { ascending: false }),
    ])
    setQrsActivos(qrs.data || [])
    setPagos(p.data || [])
    setEventos(ev.data || [])
    if (ev.data?.length && !eventoId) setEventoId(ev.data[0].id)
    setLoading(false)
  }

  const cuentasEvento = eventos.find(e => e.id === eventoId)?.cuentas_bancarias || []
  const qrsDelEvento  = qrsActivos.filter(q => q.evento_id === eventoId)

  function toggleQR(id) {
    setSelQRs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  async function submit() {
    if (!selQRs.length || !monto || !banco) { showToast('Selecciona QRs, monto y banco', 'error'); return }
    setSaving(true)

    let comprobante_url = null
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${eventoId}/${profile.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { contentType: file.type })
      if (!upErr) comprobante_url = path
    }

    const qrIds = qrsActivos.filter(q => selQRs.includes(q.id)).map(q => q.qr_id)

    const { data: pago, error } = await supabase.from('pagos').insert({
      evento_id:       eventoId,
      vendedor_id:     profile.id,
      vendedor_nombre: profile.nombre_completo,
      qr_ids:          qrIds,
      monto:           parseInt(monto),
      banco_destino:   banco,
      comprobante_url,
      estado:          'pendiente',
      fecha_reporte:   new Date().toISOString(),
    }).select().single()

    if (error) { showToast('Error al reportar pago', 'error'); setSaving(false); return }

    syncPago({ id: pago.id, vendedor_nombre: profile.nombre_completo, qr_ids: qrIds, monto: parseInt(monto), banco_destino: banco, estado: 'pendiente', fecha_reporte: pago.fecha_reporte })
    showToast('✓ Pago reportado — el admin lo validará pronto')
    setSaving(false); setView('list'); setSelQRs([]); setMonto(''); setBanco(''); setFile(null); setPreview(null)
    load()
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  // ── FORM ─────────────────────────────────────────────────
  if (view === 'form') return (
    <div className="px-4 py-4">
      <button onClick={() => setView('list')} className="flex items-center gap-1 text-brand-violet text-sm font-medium mb-4">
        <ChevronLeft size={16} /> Volver
      </button>
      <h2 className="text-[18px] font-bold text-brand-text mb-4">Reportar pago</h2>

      {eventos.length > 1 && (
        <div className="glass-card-light p-3 mb-3">
          <p className="label-dark">Evento</p>
          <select className="select-dark" value={eventoId} onChange={e => { setEventoId(e.target.value); setSelQRs([]) }}>
            {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
          </select>
        </div>
      )}

      {/* QR selection */}
      <div className="glass-card-light p-4 mb-3">
        <p className="label-dark">QRs activos a incluir ({selQRs.length} seleccionados)</p>
        {qrsDelEvento.length === 0
          ? <p className="text-sm text-brand-muted text-center py-2">No tienes QRs activos en este evento</p>
          : <div className="flex flex-wrap gap-2">
            {qrsDelEvento.map(qr => (
              <button key={qr.id} onClick={() => toggleQR(qr.id)}
                className={clsx('px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2',
                  selQRs.includes(qr.id) ? 'text-white border-brand-violet' : 'text-brand-muted border-brand-border')}
                style={selQRs.includes(qr.id) ? { background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' } : { background: 'rgba(30,30,46,0.5)' }}>
                {qr.qr_id.slice(0, 8)}...
              </button>
            ))}
          </div>
        }
      </div>

      {/* Monto */}
      <div className="glass-card-light p-4 mb-3">
        <p className="label-dark">Monto transferido</p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted text-sm font-semibold">RD$</span>
          <input className="input-dark pl-12 text-lg font-bold" type="number" inputMode="numeric"
            placeholder="0" value={monto} onChange={e => setMonto(e.target.value)} />
        </div>
      </div>

      {/* Banco */}
      <div className="glass-card-light p-4 mb-3">
        <p className="label-dark">Cuenta de destino</p>
        {cuentasEvento.length > 0 ? (
          <div className="space-y-2">
            {cuentasEvento.map((c, i) => (
              <button key={i} onClick={() => setBanco(c.banco)}
                className={clsx('w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left',
                  banco === c.banco ? 'border-brand-violet' : 'border-brand-border')}
                style={banco === c.banco ? { background: 'rgba(124,58,237,0.1)' } : { background: 'rgba(30,30,46,0.5)' }}>
                <span className="text-lg">🏦</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-brand-text">{c.banco}</p>
                  {c.numero && <p className="text-xs text-brand-muted">{c.numero}</p>}
                  {c.titular && <p className="text-xs text-brand-muted">{c.titular}</p>}
                </div>
                {banco === c.banco && <span className="text-brand-violet font-bold">✓</span>}
              </button>
            ))}
          </div>
        ) : (
          <input className="input-dark" placeholder="Nombre del banco" value={banco} onChange={e => setBanco(e.target.value)} />
        )}
      </div>

      {/* Comprobante */}
      <div className="glass-card-light p-4 mb-4">
        <p className="label-dark">Foto del comprobante</p>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        {preview ? (
          <div className="relative">
            <img src={preview} className="w-full h-40 object-cover rounded-xl" alt="Comprobante" />
            <button onClick={() => { setFile(null); setPreview(null); fileRef.current.value = '' }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white"
              style={{ background: 'rgba(0,0,0,0.6)' }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full h-32 rounded-xl flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ border: '2px dashed rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.04)' }}>
            <Camera size={28} className="text-brand-violet" />
            <span className="text-sm text-brand-violet font-semibold">Tomar foto / subir imagen</span>
            <span className="text-[11px] text-brand-subtle">Recomendado para validación rápida</span>
          </button>
        )}
      </div>

      {selQRs.length > 0 && monto && banco && (
        <div className="rounded-xl p-3 mb-4 text-sm font-semibold text-brand-green"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          ✓ {selQRs.length} QR{selQRs.length > 1 ? 's' : ''} · {fmtMoney(monto)} · {banco}
        </div>
      )}

      <button onClick={submit} disabled={saving} className="btn-full">
        {saving ? <Spinner size="sm" /> : '📤 Enviar reporte de pago'}
      </button>
      <p className="text-[10.5px] text-brand-subtle text-center mt-2">Una vez enviado no podrás modificarlo</p>
    </div>
  )

  // ── LIST ─────────────────────────────────────────────────
  return (
    <div className="px-4 py-4">
      {qrsActivos.length > 0 && (
        <div className="rounded-xl p-3 mb-4 flex items-start gap-2.5"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertCircle size={16} className="text-brand-orange flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-orange">{qrsActivos.length} QR{qrsActivos.length > 1 ? 's activos' : ' activo'} sin pago reportado</p>
            <p className="text-xs text-brand-muted mt-0.5">Reporta el pago para que el admin lo valide</p>
          </div>
          <button onClick={() => setView('form')} className="text-xs text-brand-violet font-semibold flex-shrink-0">
            Reportar →
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-bold text-brand-text">Mis pagos</h2>
        {qrsActivos.length > 0 && (
          <button onClick={() => setView('form')} className="btn-primary text-xs py-2 px-3">
            + Reportar pago
          </button>
        )}
      </div>

      {pagos.length === 0 ? (
        <EmptyState icon="🧾" title="Sin pagos" description="Cuando reportes un pago aparecerá aquí" />
      ) : (
        <div className="space-y-2">
          {pagos.map(p => (
            <div key={p.id} className="glass-card-light p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-lg',
                    p.estado === 'aprobado' ? 'bg-brand-green/10' : p.estado === 'rechazado' ? 'bg-brand-red/10' : 'bg-brand-orange/10')}>
                    {p.estado === 'aprobado' ? '✅' : p.estado === 'rechazado' ? '❌' : '⏳'}
                  </div>
                  <div>
                    <p className="font-bold text-[15px] text-brand-text">{fmtMoney(p.monto)}</p>
                    <p className="text-[11px] text-brand-muted">{p.banco_destino} · {fmtDate(p.fecha_reporte)}</p>
                  </div>
                </div>
                <Badge estado={p.estado} />
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(p.qr_ids || []).map((id, i) => (
                  <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.15)', color: '#8B5CF6' }}>
                    {String(id).slice(0, 8)}
                  </span>
                ))}
              </div>
              {p.notas_admin && (
                <p className="text-[11px] text-brand-muted mt-2 p-2 rounded-lg" style={{ background: 'rgba(30,30,46,0.5)' }}>
                  💬 Admin: {p.notas_admin}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
