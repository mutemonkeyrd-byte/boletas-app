/**
 * PDF QR Extractor
 * Reads a PDF, renders each page, finds and decodes all QR codes
 * Uses pdfjs-dist + jsQR
 */

import * as pdfjsLib from 'pdfjs-dist'
import jsQR from 'jsqr'

// Set worker path - uses CDN for simplicity
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

/**
 * Extract QR codes from a PDF file
 * @param {File} file - PDF File object
 * @param {Function} onProgress - callback(current, total)
 * @returns {Promise<Array<{qr_id: string, page: number, imageDataUrl: string}>>}
 */
export async function extractQRsFromPDF(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const totalPages = pdf.numPages
  const results = []

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (onProgress) onProgress(pageNum, totalPages)

    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 2.0 }) // high res for QR detection

    // Render to canvas
    const canvas = document.createElement('canvas')
    canvas.width  = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')

    await page.render({ canvasContext: ctx, viewport }).promise

    // Try full page first
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const qrResult  = jsQR(imageData.data, imageData.width, imageData.height)

    if (qrResult?.data) {
      results.push({
        qr_id:        qrResult.data.trim(),
        page:         pageNum,
        imageDataUrl: canvas.toDataURL('image/png'),
      })
      continue
    }

    // If no QR on full page, try grid scan (for multi-QR pages)
    // Split page into a 4x4 grid and scan each cell
    const cols = 4, rows = 4
    const cellW = Math.floor(canvas.width  / cols)
    const cellH = Math.floor(canvas.height / rows)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW, y = r * cellH
        const cellData = ctx.getImageData(x, y, cellW, cellH)
        const cellQR   = jsQR(cellData.data, cellW, cellH)

        if (cellQR?.data) {
          // Crop the cell as image
          const cropCanvas = document.createElement('canvas')
          cropCanvas.width  = cellW
          cropCanvas.height = cellH
          const cropCtx = cropCanvas.getContext('2d')
          cropCtx.putImageData(cellData, 0, 0)

          const id = cellQR.data.trim()
          // Avoid duplicates
          if (!results.find(r => r.qr_id === id)) {
            results.push({
              qr_id:        id,
              page:         pageNum,
              imageDataUrl: cropCanvas.toDataURL('image/png'),
            })
          }
        }
      }
    }
  }

  return results
}

/**
 * Convert base64 dataURL to Blob for upload
 */
export function dataURLToBlob(dataURL) {
  const [header, data] = dataURL.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const binary = atob(data)
  const array  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new Blob([array], { type: mime })
}
