import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtDate, fmtMoney } from '../../lib/utils'
import { Card, CardHeader, Badge, Modal, Field, EmptyState, Spinner, showToast } from '../../components/shared/UI'
import { Plus, CalendarDays, MapPin, DollarSign, Trash2, Lock, Percent, Hash } from 'lucide-react'

const BANCOS = ['BHD León', 'Popular', 'Banreservas', 'Scotiabank', 'BancoReservas', 'Otro']

export default function AdminEventos() {
  const { profile } = useAuth()
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '', fecha_evento: '', venue: '', precio_boleta: '',
    comision_tipo: 'fijo', comision_valor: '',
    cuentas: [{ banco: 'BHD León', numero: '', titular: '' }],
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('eventos')
      .select('id, nombre, fecha_evento, venue, precio_boleta, estado, comision_tipo, comision_valor, created_at')
      .order('created_at', { ascending: false })
    setEventos(data || [])
    setLoading(false)
  }

  function setField(f, v) { setForm(p => ({ ...p, [f]: v })) }
  function addCuenta() { setForm(f => ({ ...f, cuentas: [...f.cuentas, { banco: 'BHD León', numero: '', titular: '' }] })) }
  function removeCuenta(i) { setForm(f => ({ ...f, cuentas: f.cuentas.filter((_, idx) => idx !== i) })) }
  function setCuenta(i, field, val) {
    setForm(f => { const c = [...f.cuentas]; c[i] = { ...c[i], [field]: val }; return { ...f, cuentas: c } })
  }

  async function handleCreate() {
    if (!form.nombre || !form.precio_boleta) { showToast('Completa nombre y precio', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('eventos').insert({
      nombre: form.nombre,
      fecha_evento: form.fecha_evento || null,
      venue: form.venue,
      precio_boleta: parseInt(form.precio_boleta),
      comision_tipo: form.comision_tipo,
      comision_valor: parseFloat(form.comision_valor) || 0,
      cuentas_bancarias: form.cuentas.filter(c => c.numero),
      estado: 'activo',
      created_by: profile.id,
    })
    if (error) { showToast('Error creando evento', 'error'); setSaving(false); return }
    showToast('✓ Evento creado')
    setShowModal(false)
    resetForm()
    setSaving(false)
    load()
  }

  function resetForm() {
    setForm({ nombre: '', fecha_evento: '', venue: '', precio_boleta: '', comision_tipo: 'fijo', comision_valor: '', cuentas: [{ banco: 'BHD León', numero: '', titular: '' }] })
  }

  async function cerrar(id) {
    if (!confirm('¿Cerrar este evento?')) return
    await supabase.from('eventos').update({ estado: 'cerrado' }).eq('id', id)
    showToast('Evento cerrado')
    load()
  }

  const comisionLabel = (ev) => {
    if (!ev.comision_valor) return '—'
    return ev.comision_tipo === 'porcentaje' ? `${ev.comision_valor}%` : fmtMoney(ev.comision_valor)
  }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-brand-border/50 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)' }}>
        <div>
          <h1 className="text-[22px] font-bold text-brand-text">Eventos</h1>
          <p className="text-xs text-brand-muted">{eventos.length} eventos registrados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
          <Plus size={14} /> Nuevo evento
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : eventos.length === 0 ? (
          <EmptyState icon="🎪" title="Sin eventos" description="Crea tu primer evento"
            action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={14} />Crear evento</button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {eventos.map(ev => (
              <div key={ev.id} className="glass-card p-5 hover:border-brand-purple/30 transition-all duration-200 group"
                style={{ cursor: 'default' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(59,130,246,0.2))', border: '1px solid rgba(124,58,237,0.2)' }}>
                    🎟
                  </div>
                  <Badge estado={ev.estado} />
                </div>
                <h3 className="font-bold text-[15px] text-brand-text leading-tight mb-3">{ev.nombre}</h3>
                <div className="space-y-2">
                  {ev.fecha_evento && (
                    <div className="flex items-center gap-2 text-xs text-brand-muted">
                      <CalendarDays size={12} className="text-brand-violet" />
                      {fmtDate(ev.fecha_evento)}
                    </div>
                  )}
                  {ev.venue && (
                    <div className="flex items-center gap-2 text-xs text-brand-muted">
                      <MapPin size={12} className="text-brand-red" />
                      {ev.venue}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-brand-muted">
                    <DollarSign size={12} className="text-brand-green" />
                    {fmtMoney(ev.precio_boleta)} por ticket
                  </div>
                  <div className="flex items-center gap-2 text-xs text-brand-muted">
                    <Percent size={12} className="text-brand-orange" />
                    Comisión: {comisionLabel(ev)}
                  </div>
                </div>
                {ev.estado === 'activo' && (
                  <button onClick={() => cerrar(ev.id)}
                    className="mt-4 flex items-center gap-1.5 text-xs text-brand-subtle hover:text-brand-red transition-colors">
                    <Lock size={11} /> Cerrar evento
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }} title="Nuevo evento" size="lg">
        <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
          <Field label="Nombre del evento *">
            <input className="input-dark" placeholder="Ej: The Martinez Brothers Vol. 3"
              value={form.nombre} onChange={e => setField('nombre', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha del evento">
              <input className="input-dark" type="date" value={form.fecha_evento} onChange={e => setField('fecha_evento', e.target.value)} />
            </Field>
            <Field label="Precio por ticket (RD$) *">
              <input className="input-dark" type="number" placeholder="2000"
                value={form.precio_boleta} onChange={e => setField('precio_boleta', e.target.value)} />
            </Field>
          </div>
          <Field label="Venue / Lugar">
            <input className="input-dark" placeholder="Ej: Oceana Social Club"
              value={form.venue} onChange={e => setField('venue', e.target.value)} />
          </Field>

          {/* Comisión */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <p className="text-xs font-semibold text-brand-green mb-3">💰 Comisión por vendedor</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo" className="mb-0">
                <select className="select-dark" value={form.comision_tipo} onChange={e => setField('comision_tipo', e.target.value)}>
                  <option value="fijo">Monto fijo (RD$)</option>
                  <option value="porcentaje">Porcentaje (%)</option>
                </select>
              </Field>
              <Field label={form.comision_tipo === 'porcentaje' ? 'Porcentaje (%)' : 'Monto (RD$)'} className="mb-0">
                <input className="input-dark" type="number"
                  placeholder={form.comision_tipo === 'porcentaje' ? '10' : '200'}
                  value={form.comision_valor} onChange={e => setField('comision_valor', e.target.value)} />
              </Field>
            </div>
            {form.precio_boleta && form.comision_valor && (
              <p className="text-xs text-brand-green mt-2">
                ≈ {form.comision_tipo === 'porcentaje'
                  ? fmtMoney(Math.round(parseInt(form.precio_boleta) * parseFloat(form.comision_valor) / 100))
                  : fmtMoney(parseInt(form.comision_valor))} por ticket vendido
              </p>
            )}
          </div>

          {/* Cuentas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-dark mb-0">Cuentas bancarias para pagos</label>
              <button onClick={addCuenta} className="text-xs text-brand-violet font-semibold">+ Agregar</button>
            </div>
            {form.cuentas.map((c, i) => (
              <div key={i} className="rounded-xl p-3 mb-2 space-y-2"
                style={{ background: 'rgba(30,30,46,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-brand-subtle">Cuenta {i + 1}</span>
                  {form.cuentas.length > 1 && (
                    <button onClick={() => removeCuenta(i)} className="text-brand-red"><Trash2 size={12} /></button>
                  )}
                </div>
                <select className="select-dark text-sm" value={c.banco} onChange={e => setCuenta(i, 'banco', e.target.value)}>
                  {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <input className="input-dark text-sm" placeholder="Número de cuenta"
                  value={c.numero} onChange={e => setCuenta(i, 'numero', e.target.value)} />
                <input className="input-dark text-sm" placeholder="Titular de la cuenta"
                  value={c.titular} onChange={e => setCuenta(i, 'titular', e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-5 pt-4 border-t border-brand-border/50">
          <button onClick={() => { setShowModal(false); resetForm() }} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Creando...' : '✓ Crear evento'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
