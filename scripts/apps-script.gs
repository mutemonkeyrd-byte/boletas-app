/**
 * BoletasApp v3 — Google Apps Script Webhook
 * Receives data from Supabase and syncs to Google Sheets
 *
 * SETUP:
 * 1. Create Google Sheet with tabs: QRCodes | Pagos | Vendedores
 * 2. Extensions > Apps Script > paste this code > Save
 * 3. Deploy > New deployment > Web App
 *    Execute as: Me | Access: Anyone
 * 4. Copy URL > set as VITE_GAS_WEBHOOK_URL in Vercel
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

function doPost(e) {
  try {
    const { action, payload } = JSON.parse(e.postData.contents);
    if (action === 'upsert_qr')       upsertQR(payload);
    if (action === 'upsert_pago')     upsertPago(payload);
    if (action === 'upsert_vendedor') upsertVendedor(payload);
    return ok();
  } catch(err) { return err_(err.message); }
}

function getSheet(name, headers) {
  let s = SS.getSheetByName(name);
  if (!s) {
    s = SS.insertSheet(name);
    const r = s.getRange(1, 1, 1, headers.length);
    r.setValues([headers]).setFontWeight('bold').setBackground('#12121A').setFontColor('#F1F5F9');
    s.setFrozenRows(1);
  }
  return s;
}

function upsert(sheet, keyCol, keyVal, row) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyCol]) === String(keyVal)) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);
}

function upsertQR(p) {
  const s = getSheet('QRCodes', ['QR ID','Estado','Evento','Vendedor','Fecha Desbloqueo']);
  upsert(s, 0, p.qr_id, [p.qr_id, p.estado, p.evento||'', p.vendedor_nombre||'', p.fecha_desbloqueo||'']);
}

function upsertPago(p) {
  const s = getSheet('Pagos', ['ID','Vendedor','QR IDs','Monto RD$','Banco','Estado','Fecha Reporte','Notas Admin']);
  const qrStr = Array.isArray(p.qr_ids) ? p.qr_ids.join(', ') : (p.qr_ids||'');
  upsert(s, 0, p.id, [p.id||'', p.vendedor_nombre||'', qrStr, p.monto||0, p.banco_destino||'', p.estado||'', p.fecha_reporte||'', p.notas_admin||'']);
}

function upsertVendedor(p) {
  const s = getSheet('Vendedores', ['Vendedor','QRs Asig.','Vendidos','Cobrado RD$','Pendiente RD$','Comisión RD$']);
  upsert(s, 0, p.nombre, [p.nombre||'', p.asignados||0, p.vendidos||0, p.cobrado||0, p.pendiente||0, p.comision||0]);
}

function ok()      { return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON); }
function err_(msg) { return ContentService.createTextOutput(JSON.stringify({error:msg})).setMimeType(ContentService.MimeType.JSON); }
