import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import './CalculadoraDepreciacion.css'
import logoFisei from './assets/logo_Fisei.png'

export default function CalculadoraDepreciacion({ onActivoGuardado }) {
  const [nombreActivo, setNombreActivo] = useState('')
  const [tipoActivo, setTipoActivo] = useState('computo')
  const [costoAdquisicion, setCostoAdquisicion] = useState('')
  const [fechaCompra, setFechaCompra] = useState('')
  const [resultado, setResultado] = useState(null)

  const CATEGORIAS = {
    computo: { nombre: 'EQUIPO ELECTRÓNICO', etiqueta: '3 AÑOS DE DEPRECIACIÓN', anios: 3, mesesTotales: 36 },
    vehiculo: { nombre: 'VEHÍCULOS Y TRANSPORTE', etiqueta: '5 AÑOS DE DEPRECIACIÓN', anios: 5, mesesTotales: 60 },
    edificio: { nombre: 'INMUEBLES Y EDIFICIOS', etiqueta: '20 AÑOS DE DEPRECIACIÓN', anios: 20, mesesTotales: 240 }
  }

  const handleCalcular = (e) => {
    e.preventDefault()
    const vc = parseFloat(costoAdquisicion)
    if (!vc || vc <= 0 || !fechaCompra) return

    const cat = CATEGORIAS[tipoActivo]
    const vr = Math.round(vc * 0.10 * 100) / 100 // 10% obligatorio
    const vd = Math.round((vc - vr) * 100) / 100 // 90% a depreciar
    const depAnual = vd / cat.anios
    const depMensual = vd / cat.mesesTotales

    const [anioStr, mesStr] = fechaCompra.split('-')
    const anioCompra = parseInt(anioStr)
    const mesCompra = parseInt(mesStr)

    // Estado actual a la fecha de hoy
    const hoy = new Date()
    let mesesTranscurridos = (hoy.getFullYear() - anioCompra) * 12 + ((hoy.getMonth() + 1) - mesCompra)
    if (mesesTranscurridos < 0) mesesTranscurridos = 0
    if (mesesTranscurridos > cat.mesesTotales) mesesTranscurridos = cat.mesesTotales

    const depAcumuladaHoy = Math.min(vd, Math.round(mesesTranscurridos * depMensual * 100) / 100)
    const valorLibrosHoy = Math.max(vr, Math.round((vc - depAcumuladaHoy) * 100) / 100)
    const porcentajeProgreso = Math.min(100, Math.round((mesesTranscurridos / cat.mesesTotales) * 100))

    // Construcción de la tabla anual (Cierres anuales)
    const tablaAnios = []
    let mesesRestantes = cat.mesesTotales
    let anioCursor = anioCompra
    let vdaAcumulada = 0
    let vrRestante = vc

    // Fila 0: Compra
    tablaAnios.push({
      fecha: fechaCompra,
      vd: 0,
      vda: 0,
      vr: vc
    })

    while (mesesRestantes > 0) {
      let mesesAnio = (anioCursor === anioCompra)
        ? Math.min(13 - mesCompra, mesesRestantes)
        : Math.min(12, mesesRestantes)

      const vdAnio = Math.round(mesesAnio * depMensual * 100) / 100
      vdaAcumulada = Math.min(vd, Math.round((vdaAcumulada + vdAnio) * 100) / 100)
      vrRestante = Math.max(vr, Math.round((vc - vdaAcumulada) * 100) / 100)
      mesesRestantes -= mesesAnio

      tablaAnios.push({
        fecha: `01/01/${anioCursor + 1}`,
        vd: vdAnio,
        vda: vdaAcumulada,
        vr: vrRestante
      })

      anioCursor++
    }

    const dataCalculada = {
      nombreActivo,
      vc,
      vr,
      vd,
      depAnual,
      depMensual,
      cat,
      fechaCompra,
      mesesTranscurridos,
      mesesTotales: cat.mesesTotales,
      depAcumuladaHoy,
      valorLibrosHoy,
      porcentajeProgreso,
      tablaAnios
    }

    if (onActivoGuardado) {
      onActivoGuardado({
        nombre: nombreActivo,
        categoriaKey: tipoActivo,
        categoriaNombre: `${cat.nombre} (${cat.anios} años)`,
        costo: vc,
        fechaCompra: fechaCompra,
        vidaMeses: cat.mesesTotales
      })
    }

    setResultado(dataCalculada)
  }

  // GENERADOR PDF CON EL DISEÑO DE LA FICHA INDIVIDUAL
  const exportarPDF = () => {
    if (!resultado) return

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const primaryColor = [139, 29, 29] // Granate FISEI #8b1d1d
    const darkGray = [40, 40, 40]
    const lightGray = [110, 110, 110]
    const borderColor = [225, 225, 225]
    const cardBg = [253, 250, 250]

    // 1. Franja decorativa superior
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, 210, 4, 'F')

    // 2. Encabezado institucional con logo
    try {
      doc.addImage(logoFisei, 'PNG', 14, 10, 18, 18)
    } catch {
      // Respaldo si la imagen aún no está cargada en base64
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...primaryColor)
    doc.text('FACULTAD DE INGENIERÍA EN SISTEMAS,', 36, 16)
    doc.text('ELECTRÓNICA E INDUSTRIAL', 36, 21.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...lightGray)
    doc.text('Sistema de Depreciación de Activos · Normativa Ecuatoriana', 36, 26.5)

    // Línea divisoria
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.4)
    doc.line(14, 31, 196, 31)

    // 3. Banner de Título Principal
    doc.setFillColor(...primaryColor)
    doc.roundedRect(14, 35, 182, 9, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text('FICHA INDIVIDUAL DE DEPRECIACIÓN', 105, 41, { align: 'center' })

    // 4. Tarjeta identificadora del Activo
    doc.setFillColor(254, 248, 248)
    doc.roundedRect(14, 48, 182, 22, 2, 2, 'F')
    doc.setFillColor(...primaryColor)
    doc.rect(14, 48, 2.5, 22, 'F') // Barra lateral roja

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...primaryColor)
    doc.text(`${resultado.cat.nombre} · ${resultado.cat.etiqueta}`, 20, 53.5)

    doc.setFontSize(14)
    doc.setTextColor(...darkGray)
    doc.text(resultado.nombreActivo || 'Computadora HP EliteBook', 20, 60.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...lightGray)
    const fechaFormatoCompra = resultado.fechaCompra.split('-').reverse().join('/')
    const hoyStr = new Date().toLocaleDateString('es-EC')

    doc.text(`Fecha de compra: `, 20, 66)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkGray)
    doc.text(fechaFormatoCompra, 46, 66)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...lightGray)
    doc.text(`Ficha N°: `, 85, 66)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkGray)
    doc.text('ACT-001', 99, 66)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...lightGray)
    doc.text(`Emitido: `, 135, 66)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkGray)
    doc.text(hoyStr, 148, 66)

    // 5. Sección 1: Datos del Activo
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...primaryColor)
    doc.text('1. DATOS DEL ACTIVO', 14, 76)

    const dibujarTarjetaMetrica = (x, y, w, h, titulo, valor, colorValor = darkGray) => {
      doc.setFillColor(...cardBg)
      doc.setDrawColor(...borderColor)
      doc.setLineWidth(0.3)
      doc.roundedRect(x, y, w, h, 2, 2, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...lightGray)
      doc.text(titulo, x + 4, y + 6)

      doc.setFontSize(12)
      doc.setTextColor(...colorValor)
      doc.text(valor, x + 4, y + 13.5)
    }

    const cardW = 88.5
    const cardH = 17
    // Fila 1
    dibujarTarjetaMetrica(14, 80, cardW, cardH, 'VALOR DE COMPRA', `$${resultado.vc.toFixed(2)}`)
    dibujarTarjetaMetrica(107.5, 80, cardW, cardH, 'VALOR RESIDUAL (10%)', `$${resultado.vr.toFixed(2)}`)
    // Fila 2
    dibujarTarjetaMetrica(14, 100, cardW, cardH, 'VALOR A DEPRECIAR', `$${resultado.vd.toFixed(2)}`)
    dibujarTarjetaMetrica(107.5, 100, cardW, cardH, 'DEPRECIACIÓN ANUAL', `$${resultado.depAnual.toFixed(2)}`, primaryColor)
    // Fila 3
    dibujarTarjetaMetrica(14, 120, cardW, cardH, 'DEPRECIACIÓN MENSUAL', `$${resultado.depMensual.toFixed(2)}`, primaryColor)
    dibujarTarjetaMetrica(107.5, 120, cardW, cardH, 'VIDA ÚTIL', `${resultado.mesesTotales} meses`)

    // 6. Sección 2: Tabla de Depreciación Anual
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...primaryColor)
    doc.text('2. TABLA DE DEPRECIACIÓN ANUAL', 14, 144)

    const columnas = ['FECHA', 'DEPRECIACIÓN DEL AÑO', 'DEPRECIACIÓN ACUMULADA', 'VALOR EN LIBROS']
    const filas = resultado.tablaAnios.map(r => [
      r.fecha.includes('-') ? r.fecha.split('-').reverse().join('/') : r.fecha,
      `$${r.vd.toFixed(2)}`,
      `$${r.vda.toFixed(2)}`,
      `$${r.vr.toFixed(2)}`
    ])

    autoTable(doc, {
      startY: 147,
      margin: { left: 14, right: 14 },
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: darkGray,
        cellPadding: 3.2
      },
      alternateRowStyles: {
        fillColor: [254, 250, 250]
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right', fontStyle: 'bold', textColor: primaryColor },
        3: { halign: 'right' }
      }
    })

    // 7. Sección 3: Estado Actual del Activo
    const finalY = doc.lastAutoTable.finalY + 8

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...primaryColor)
    doc.text('3. ESTADO ACTUAL DEL ACTIVO', 14, finalY)

    const boxY = finalY + 4
    doc.setFillColor(254, 250, 250)
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.4)
    doc.roundedRect(14, boxY, 182, 45, 3, 3, 'FD')

    // Título de la tarjeta de estado
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...primaryColor)
    doc.text(`RESUMEN A LA FECHA: ${hoyStr}`, 20, boxY + 8)

    // Meses depreciados
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...lightGray)
    doc.text('Meses depreciados', 20, boxY + 16)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...darkGray)
    doc.text(`${resultado.mesesTranscurridos} / ${resultado.mesesTotales}`, 20, boxY + 23)

    // Depreciación acumulada
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...lightGray)
    doc.text('Depreciación acumulada', 110, boxY + 16)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...primaryColor)
    doc.text(`$${resultado.depAcumuladaHoy.toFixed(2)}`, 110, boxY + 23)

    // Valor actual en libros
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...lightGray)
    doc.text('Valor actual en libros', 20, boxY + 30)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(25, 135, 84) // Verde contable
    doc.text(`$${resultado.valorLibrosHoy.toFixed(2)}`, 20, boxY + 37)

    // Línea discontinua
    doc.setDrawColor(220, 220, 220)
    doc.setLineDashPattern([1, 1], 0)
    doc.line(20, boxY + 41, 190, boxY + 41)
    doc.setLineDashPattern([], 0)

    // Barra de Progreso
    const barraY = boxY + 45
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...lightGray)
    doc.text('Progreso de depreciación', 20, barraY - 1.5)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkGray)
    doc.text(`${resultado.porcentajeProgreso}%`, 183, barraY - 1.5)

    // Contenedor fondo barra
    doc.setFillColor(235, 235, 235)
    doc.roundedRect(20, barraY, 170, 3.5, 1.5, 1.5, 'F')

    // Relleno barra granate según % progreso
    if (resultado.porcentajeProgreso > 0) {
      doc.setFillColor(...primaryColor)
      const anchoProgreso = (170 * resultado.porcentajeProgreso) / 100
      doc.roundedRect(20, barraY, anchoProgreso, 3.5, 1.5, 1.5, 'F')
    }

    doc.save(`Ficha_Depreciacion_${(resultado.nombreActivo || 'Activo').replace(/\s+/g, '_')}.pdf`)
  }

  return (
    <div>
      <div className="calc-card">
        <h3 className="calc-title">
          Parámetros del Activo Fijo 
        </h3>

        <form onSubmit={handleCalcular}>
          <div className="calc-grid">
            <div>
              <label className="calc-label">Nombre del Activo</label>
              <div className="calc-input-box">
                <input
                  type="text"
                  className="calc-input"
                  placeholder="Ej. Computadora HP EliteBook"
                  value={nombreActivo}
                  onChange={(e) => setNombreActivo(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="calc-label">Categoría Tributaria</label>
              <div className="calc-input-box">
                <select
                  className="calc-select"
                  value={tipoActivo}
                  onChange={(e) => setTipoActivo(e.target.value)}
                >
                  <option value="computo">Equipo Electrónico / Muebles (3 años)</option>
                  <option value="vehiculo">Vehículos (5 años)</option>
                  <option value="edificio">Inmuebles / Edificios (20 años)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="calc-label">Costo de Adquisición ($ USD)</label>
              <div className="calc-input-box">
                <input
                  type="number"
                  step="0.01"
                  className="calc-input"
                  placeholder="900.00"
                  value={costoAdquisicion}
                  onChange={(e) => setCostoAdquisicion(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="calc-label">Fecha de Adquisición</label>
              <div className="calc-input-box">
                <input
                  type="date"
                  className="calc-input"
                  value={fechaCompra}
                  onChange={(e) => setFechaCompra(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="calc-btn-container">
            <button type="submit" className="calc-btn-submit">
              Calcular Depreciación →
            </button>
          </div>
        </form>
      </div>

      {resultado && (
        <div>
          {/* Métricas en Pantalla */}
          <div className="calc-metrics">
            <div className="metric-item warning">
              <div className="metric-lbl">Valor Residual (10%)</div>
              <div className="metric-val" style={{ color: '#d97706' }}>${resultado.vr.toFixed(2)}</div>
            </div>

            <div className="metric-item accent">
              <div className="metric-lbl">A Depreciar (VD)</div>
              <div className="metric-val" style={{ color: '#94191d' }}>${resultado.vd.toFixed(2)}</div>
            </div>

            <div className="metric-item info">
              <div className="metric-lbl">Cuota Mensual</div>
              <div className="metric-val" style={{ color: '#0891b2' }}>${resultado.depMensual.toFixed(2)}</div>
            </div>

            <div className="metric-item success">
              <div className="metric-lbl">Valor en Libros a Hoy</div>
              <div className="metric-val" style={{ color: '#059669' }}>${resultado.valorLibrosHoy.toFixed(2)}</div>
              <div className="metric-sub">
                {resultado.mesesTranscurridos} de {resultado.mesesTotales} meses consumidos ({resultado.porcentajeProgreso}%)
              </div>
            </div>
          </div>

          {/* Tabla de resultados y botón de exportación */}
          <div className="calc-table-box">
            <div className="table-topbar">
              <div>
                <h4>Tabla Anual de Depreciación (SRI / Método de Línea Recta)</h4>
              </div>
              <button type="button" onClick={exportarPDF} className="btn-download-pdf">
                📄 Descargar Ficha PDF
              </button>
            </div>

            <div className="table-scroll">
              <table className="table-data">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Fecha</th>
                    <th style={{ textAlign: 'right' }}>Depreciación del Año</th>
                    <th style={{ textAlign: 'right' }}>Depreciación Acumulada</th>
                    <th style={{ textAlign: 'right' }}>Valor en Libros</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.tablaAnios.map((r, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'left', fontWeight: '500' }}>
                        {r.fecha.includes('-') ? r.fecha.split('-').reverse().join('/') : r.fecha}
                      </td>
                      <td style={{ textAlign: 'right' }}>${r.vd.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: '#94191d', fontWeight: '700' }}>${r.vda.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#1f2937' }}>${r.vr.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}