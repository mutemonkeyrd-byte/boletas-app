import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { extractQRsFromPDF, dataURLToBlob } from '../../lib/qrExtractor'
import { fmtDate } from '../../lib/utils'
import { Card, CardHeader, Badge, QRCard, Modal, Field, EmptyState, Spinner, showToast } from '../../components/shared/UI'
import { Upload, QrCode, Plus, RefreshCw, Users } from 'lucide-react'
import clsx from 'clsx'

export default function AdminQRCodes() {
  const [eventos, setEventos]     = useState([])
  const [eventoId, setEventoId]   = useState('')
  const [qrs, setQrs]             = useState([])
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, step: '' })
  const [showAssign, setShowAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({ vendedor_id: '', cantidad: '' })
  const [savingAssign, setSavingAssign] = useState(false)
  const [filterEstado, setFilterEstado] = useState('')
  const pdfRef = useRef()

  useEffect(() => { loadEventos() }, [])
  useEffect(() => { if (eventoId) loadQRs() }, [eventoId, filterEstado])

  async function loadEventos() {
    const [evs, vends] = await Promise.all([
      supabase.from('eventos').select('id,nombre,precio_boleta,comision_tipo,comision_valor').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,nombre_completo').eq('rol', 'vendedor').eq('estado', 'aprobado'),
    ])
    setEventos(evs.data || [])
    setVendedores(vends.data || [])
    if (evs.data?.length && !eventoId) setEventoId(evs.data[0].id)
    else if (!evs.data?.length) setLoading(false)
  }

  async function loadQRs() {
    setLoading(true)
    let q = supabase.from('qr_codes').select('*, profiles(nombre_completo)').eq('evento_id', eventoId).order('created_at')
    if (filterEstado) q = q.eq('estado', filterEstado)
    const { data } = await q
    setQrs(data || [])
    setLoading(false)
  }

  async function handlePDFUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !eventoId) { showToast('Selecciona un evento primero', 'error'); return }
    if (file.type !== 'application/pdf') { showToast('Solo se aceptan archivos PDF', 'error'); return }

    setUploading(true)
    setUploadProgress({ current: 0, total: 0, step: 'Leyendo PDF...' })

    try {
      // Extract QRs from PDF
      const extracted = await extractQRsFromPDF(file, (current, total) => {
        setUploadProgress({ current, total, step: `Procesando página ${current} de ${total}...` })
      })

      if (extracted.length === 0) {
        showToast('No se encontraron códigos QR en el PDF', 'error')
        setUploading(false)
        pdfRef.current.value = ''
        return
      }

      setUploadProgress({ current: 0, total: extracted.length, step: `Subiendo ${extracted.length} QRs...` })

      let saved = 0
      for (const qr of extracted) {
        // Check for duplicate qr_id in this evento
        const { data: existing } = await supabase
          .from('qr_codes')
          .select('id')
          .eq('evento_id', eventoId)
          .eq('qr_id', qr.qr_id)
          .single()

        if (existing) { saved++; setUploadProgress(p => ({ ...p, current: saved })); continue }

        // Upload image to storage
        const blob = dataURLToBlob(qr.imageDataUrl)
        const path = `${eventoId}/qr_${qr.qr_id.replace(/[^a-zA-Z0-9]/g, '_')}.png`
        let imageUrl = null

        const { error: uploadErr } = await supabase.storage.from('qr-images').upload(path, blob, { contentType: 'image/png', upsert: true })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('qr-images').getPublicUrl(path)
          imageUrl = urlData?.publicUrl || null
        }

        // Insert QR record
        await supabase.from('qr_codes').insert({
          evento_id:     eventoId,
          qr_id:         qr.qr_id,
          qr_image_url:  imageUrl,
          estado:        'bloqueado',
        })

        saved++
        setUploadProgress(p => ({ ...p, current: saved, step: `Guardando QR ${saved} de ${extracted.length}...` }))
      }

      showToast(`✓ ${saved} QRs subidos correctamente`)
      loadQRs()
    } catch (err) {
      console.error(err)
      showToast('Error procesando el PDF: ' + err.message, 'error')
    }

    setUploading(false)
    pdfRef.current.value = ''
    setUploadProgress({ current: 0, total: 0, step: '' })
  }

  async function handleAsignar() {
    if (!assignForm.vendedor_id || !assignForm.cantidad) { showToast('Completa todos los campos', 'error'); return }
    const cantidad = parseInt(assignForm.cantidad)
    if (cantidad < 1) { showToast('Cantidad inválida', 'error'); return }

    setSavingAssign(true)
    const disponibles = qrs.filter(q => q.estado === 'bloqueado' && !q.vendedor_id).slice(0, cantidad)
    if (disponibles.length < cantidad) {
      showToast(`Solo hay ${disponibles.length} QRs disponibles sin asignar`, 'error')
      setSavingAssign(false)
      return
    }

    const v = vendedores.find(x => x.id === assignForm.vendedor_id)
    const ids = disponibles.map(q => q.id)
    const { error } = await supabase.from('qr_codes')
      .update({ vendedor_id: assignForm.vendedor_id, vendedor_nombre: v?.nombre_completo || '' })
      .in('id', ids)

    if (error) { showToast('Error al asignar', 'error'); setSavingAssign(false); return }
    showToast(`✓ ${cantidad} QRs asignados a ${v?.nombre_completo}`)
    setShowAssign(false)
    setAssignForm({ vendedor_id: '', cantidad: '' })
    setSavingAssign(false)
    loadQRs()
  }

  const counts = {
    total: qrs.length,
    sinAsignar: qrs.filter(q => !q.vendedor_id).length,
    bloqueados: qrs.filter(q => q.estado === 'bloqueado').length,
    desbloqueados: qrs.filter(q => q.estado === 'desbloqueado').length,
    vendidos: qrs.filter(q => q.estado === 'vendido').length,
  }

  const ESTADOS = [
    { v: '', l: 'Todos' },
    { v: 'bloqueado', l: 'Bloqueados' },
    { v: 'desbloqueado', l: 'Activos' },
    { v: 'vendido', l: 'Vendidos' },
    { v: 'entregado', l: 'Entregados' },
  ]

  return (
    <div>
      {/* TOPBAR */}
      <div className="sticky top-0 z-10 border-b border-brand-border/50 px-6 py-4 flex flex-wrap items-center gap-3 justify-between"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)' }}>
        <div>
          <h1 className="text-[22px] font-bold text-brand-text">QR Codes</h1>
          <p className="text-xs text-brand-muted">{counts.total} códigos · {counts.sinAsignar} sin asignar</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {eventos.length > 1 && (
            <select className="select-dark text-sm w-auto py-2 px-3" value={eventoId} onChange={e => setEventoId(e.target.value)}>
              {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
            </select>
          )}
          <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={handlePDFUpload} />
          <button onClick={() => pdfRef.current?.click()} disabled={uploading} className="btn-secondary text-sm">
            <Upload size={14} /> Subir PDF
          </button>
          <button onClick={() => setShowAssign(true)} disabled={counts.sinAsignar === 0} className="btn-primary text-sm">
            <Users size={14} /> Asignar QRs
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Upload progress */}
        {uploading && (
          <div className="glass-card p-5 mb-5 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center spin-slow"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>
                <QrCode size={14} className="text-white" />
              </div>
              <span className="font-semibold text-brand-text">Procesando PDF...</span>
            </div>
            <p className="text-sm text-brand-muted mb-3">{uploadProgress.step}</p>
            {uploadProgress.total > 0 && (
              <div className="w-full bg-brand-border rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(uploadProgress.current / uploadProgress.total * 100)}%`, background: 'linear-gradient(90deg,#7C3AED,#3B82F6)' }} />
              </div>
            )}
            {uploadProgress.total > 0 && (
              <p className="text-xs text-brand-subtle mt-2">{uploadProgress.current} / {uploadProgress.total}</p>
            )}
          </div>
        )}

        {/* Stats mini */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { l: 'Total', v: counts.total, c: 'text-brand-violet' },
            { l: 'Bloqueados', v: counts.bloqueados, c: 'text-brand-muted' },
            { l: 'Activos', v: counts.desbloqueados, c: 'text-brand-orange' },
            { l: 'Vendidos', v: counts.vendidos, c: 'text-brand-green' },
          ].map(s => (
            <div key={s.l} className="glass-card-light p-3 text-center">
              <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
              <p className="text-[11px] text-brand-subtle mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {ESTADOS.map(f => (
            <button key={f.v} onClick={() => setFilterEstado(f.v)}
              className={clsx('flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                filterEstado === f.v ? 'text-white' : 'text-brand-muted')}
              style={filterEstado === f.v ? { background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' } : { background: 'rgba(30,30,46,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {f.l}
            </button>
          ))}
          <button onClick={loadQRs} className="flex-shrink-0 p-1.5 rounded-full text-brand-subtle hover:text-brand-muted transition-colors ml-auto" style={{ background: 'rgba(30,30,46,0.6)' }}>
            <RefreshCw size={13} />
          </button>
        </div>

        {/* QR Grid */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : qrs.length === 0 ? (
          <EmptyState icon="🔲" title={uploading ? 'Procesando...' : 'Sin QRs cargados'}
            description={uploading ? '' : 'Sube un PDF con los códigos QR del evento'}
            action={!uploading && <button onClick={() => pdfRef.current?.click()} className="btn-primary"><Upload size={14} />Subir PDF</button>} />
        ) : (
          <>
            {/* Group by vendedor */}
            {(() => {
              const groups = {}
              qrs.forEach(q => {
                const key = q.vendedor_id ? (q.vendedor_nombre || q.vendedor_id) : '__sin_asignar__'
                if (!groups[key]) groups[key] = { nombre: q.vendedor_id ? q.vendedor_nombre : 'Sin asignar', items: [] }
                groups[key].items.push(q)
              })
              return Object.entries(groups).map(([key, group]) => (
                <div key={key} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm font-semibold text-brand-text">{group.nombre}</p>
                    <span className="text-xs text-brand-subtle">({group.items.length} QRs)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {group.items.map(qr => (
                      <div key={qr.id} className="glass-card-light p-3 flex flex-col items-center gap-2">
                        <div className="relative w-full aspect-square max-w-[100px] rounded-lg overflow-hidden bg-white">
                          {qr.qr_image_url ? (
                            <img src={qr.qr_image_url} alt={qr.qr_id}
                              className={clsx('w-full h-full object-contain', qr.estado === 'bloqueado' ? 'qr-locked' : 'qr-unlocked')} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-brand-surface"><QrCode size={24} className="text-brand-subtle" /></div>
                          )}
                          {qr.estado === 'bloqueado' && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,10,15,0.4)' }}>
                              <span className="text-white text-lg">🔒</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[9px] font-mono text-brand-subtle truncate w-full text-center">{qr.qr_id.slice(0, 12)}...</p>
                        <Badge estado={qr.estado} className="text-[9px] px-1.5 py-0.5" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            })()}
          </>
        )}
      </div>

      {/* ASSIGN MODAL */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Asignar QRs a vendedor">
        <div className="space-y-4">
          <div className="rounded-xl p-3 text-xs text-brand-violet"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
            Se asignarán QRs en estado <strong>Bloqueado</strong> y sin asignar. El vendedor los verá borrosos hasta que los desbloquee.
          </div>
          <div className="text-sm text-brand-text p-3 rounded-xl" style={{ background: 'rgba(30,30,46,0.5)' }}>
            <span className="text-brand-violet font-semibold">{counts.sinAsignar}</span> QRs disponibles para asignar
          </div>
          <Field label="Vendedor">
            <select className="select-dark" value={assignForm.vendedor_id}
              onChange={e => setAssignForm(f => ({ ...f, vendedor_id: e.target.value }))}>
              <option value="">Seleccionar vendedor aprobado...</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre_completo}</option>)}
            </select>
          </Field>
          <Field label={`Cantidad de QRs (máx. ${counts.sinAsignar})`}>
            <input className="input-dark" type="number" min="1" max={counts.sinAsignar}
              placeholder={`1 - ${counts.sinAsignar}`}
              value={assignForm.cantidad}
              onChange={e => setAssignForm(f => ({ ...f, cantidad: e.target.value }))} />
          </Field>
          <div className="flex gap-3">
            <button onClick={() => setShowAssign(false)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={handleAsignar} disabled={savingAssign} className="btn-primary flex-1">
              {savingAssign ? 'Asignando...' : 'Asignar QRs'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
