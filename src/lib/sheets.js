const GAS_URL = import.meta.env.VITE_GAS_WEBHOOK_URL || ''

export async function syncToSheets(action, payload) {
  if (!GAS_URL) return
  try {
    await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, payload, ts: new Date().toISOString() }),
    })
  } catch (e) {
    console.warn('[Sheets sync]', e.message)
  }
}

export const syncPago    = (p) => syncToSheets('upsert_pago', p)
export const syncQR      = (q) => syncToSheets('upsert_qr', q)
export const syncVendedor = (v) => syncToSheets('upsert_vendedor', v)
