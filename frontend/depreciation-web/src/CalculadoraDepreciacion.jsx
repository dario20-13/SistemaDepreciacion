import { useEffect, useState } from 'react'
import axios from 'axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import './CalculadoraDepreciacion.css'
import logoFisei from './assets/logo_Fisei.png'

export default function CalculadoraDepreciacion({ onActivoGuardado }) {

  const [nombreActivo, setNombreActivo] = useState('')
  const [tipoActivo, setTipoActivo] = useState('')
  const [costoAdquisicion, setCostoAdquisicion] = useState('')
  const [fechaCompra, setFechaCompra] = useState('')
  const [resultado, setResultado] = useState(null)
  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const token = localStorage.getItem('token')

        const respuesta = await axios.get(
          'http://localhost:5005/api/categorias',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        setCategorias(respuesta.data)
      } catch (error) {
        console.error(
          'Error al cargar categorías:',
          error.response?.data || error.message
        )
      }
    }

    cargarCategorias()
  }, [])

  const handleCalcular = async () => {

    console.log('BOTÓN CALCULAR PRESIONADO')

    const vc = parseFloat(costoAdquisicion)

    if (!nombreActivo.trim()) {
      alert('Ingrese el nombre del activo')
      return
    }

    if (!vc || vc <= 0) {
      alert('Ingrese un costo válido')
      return
    }

    if (!fechaCompra) {
      alert('Seleccione la fecha de adquisición')
      return
    }

    if (!tipoActivo) {
      alert('Seleccione una categoría')
      return
    }

    const categoriaSeleccionada = categorias.find(
      (categoria) =>
        categoria.id === Number(tipoActivo)
    )

    if (!categoriaSeleccionada) {
      alert('No se encontró la categoría seleccionada')
      return
    }

    const token = localStorage.getItem('token')

    if (!token) {
      alert('No existe una sesión activa')
      return
    }

    let respuestaActivo

    try {
      respuestaActivo = await axios.post(
        'http://localhost:5005/api/activos',
        {
          categoriaId: categoriaSeleccionada.id,
          nombre: nombreActivo,
          costoAdquisicion: vc,
          fechaCompra: fechaCompra
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log(
        'ACTIVO GUARDADO:',
        respuestaActivo.data
      )

    } catch (error) {
      console.error(
        'ERROR AL GUARDAR ACTIVO:',
        error.response?.data || error.message
      )

      alert(
        error.response?.data?.message ||
        error.response?.data?.title ||
        'No se pudo guardar el activo'
      )

      return
    }

    const activoId =
      respuestaActivo.data.id ??
      respuestaActivo.data.Id ??
      respuestaActivo.data.activoId

    if (!activoId) {
      alert('El backend no devolvió el ID del activo')
      return
    }

    console.log('ID DEL ACTIVO:', activoId)

    let respuestaDepreciacion

    try {

      const hoy = new Date()

      const fechaHasta =
        `${hoy.getFullYear()}-${String(
          hoy.getMonth() + 1
        ).padStart(2, '0')}-${String(
          hoy.getDate()
        ).padStart(2, '0')}`

      console.log(
        'FECHA HASTA ENVIADA:',
        fechaHasta
      )

      respuestaDepreciacion = await axios.post(
        'http://localhost:5045/api/depreciacion/calcular',
        {
          activoId: Number(activoId),
          fechaHasta: fechaHasta
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log(
        'DEPRECIACIÓN:',
        respuestaDepreciacion.data
      )

    } catch (error) {
      console.error(
        'ERROR AL CALCULAR DEPRECIACIÓN:',
        error.response?.data || error.message
      )

      alert(
        error.response?.data?.message ||
        error.response?.data?.title ||
        'No se pudo calcular la depreciación'
      )

      return
    }

    const mesesTotales =
      categoriaSeleccionada.vidaUtilMeses

    const porcentajeResidual =
      categoriaSeleccionada.valorResidualPorcentaje

    const anios =
      mesesTotales / 12

    const vr =
      Math.round(
        vc *
        (porcentajeResidual / 100) *
        100
      ) / 100

    const vd =
      Math.round(
        (vc - vr) *
        100
      ) / 100

    const depAnual =
      Math.round(
        (vd / anios) *
        100
      ) / 100

    const depMensual =
      Math.round(
        (vd / mesesTotales) *
        100
      ) / 100

    const fechaInicio =
      new Date(
        fechaCompra + 'T00:00:00'
      )

    const hoy =
      new Date()

    let mesesTranscurridos =
      (
        hoy.getFullYear() -
        fechaInicio.getFullYear()
      ) * 12 +
      (
        hoy.getMonth() -
        fechaInicio.getMonth()
      )

    if (mesesTranscurridos < 0) {
      mesesTranscurridos = 0
    }

    if (mesesTranscurridos > mesesTotales) {
      mesesTranscurridos = mesesTotales
    }

    const depAcumuladaHoy =
      Math.min(
        vd,
        Math.round(
          mesesTranscurridos *
          depMensual *
          100
        ) / 100
      )

    const valorLibrosHoy =
      Math.max(
        vr,
        Math.round(
          (
            vc -
            depAcumuladaHoy
          ) * 100
        ) / 100
      )

    const porcentajeProgreso =
      Math.min(
        100,
        Math.round(
          (
            mesesTranscurridos /
            mesesTotales
          ) * 100
        )
      )

    const tablaAnios = []

    let mesesRestantes =
      mesesTotales

    let anioCursor =
      fechaInicio.getFullYear()

    let vdaAcumulada = 0

    tablaAnios.push({
      fecha: fechaCompra,
      vd: 0,
      vda: 0,
      vr: vc
    })

    while (mesesRestantes > 0) {

      let mesesAnio

      if (
        anioCursor ===
        fechaInicio.getFullYear()
      ) {
        mesesAnio =
          Math.min(
            12 -
            fechaInicio.getMonth(),
            mesesRestantes
          )
      } else {
        mesesAnio =
          Math.min(
            12,
            mesesRestantes
          )
      }

      const vdAnio =
        Math.min(
          vd - vdaAcumulada,
          Math.round(
            mesesAnio *
            depMensual *
            100
          ) / 100
        )

      vdaAcumulada =
        Math.round(
          (
            vdaAcumulada +
            vdAnio
          ) * 100
        ) / 100

      const vrAnio =
        Math.max(
          vr,
          Math.round(
            (
              vc -
              vdaAcumulada
            ) * 100
          ) / 100
        )

      mesesRestantes -= mesesAnio

      tablaAnios.push({
        fecha:
          `01/01/${anioCursor + 1}`,
        vd: vdAnio,
        vda: vdaAcumulada,
        vr: vrAnio
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
      cat: {
        nombre:
          categoriaSeleccionada.nombre,
        etiqueta:
          `${anios} AÑOS DE DEPRECIACIÓN`,
        anios,
        mesesTotales,
        porcentajeResidual
      },
      fechaCompra,
      mesesTranscurridos,
      mesesTotales,
      depAcumuladaHoy,
      valorLibrosHoy,
      porcentajeProgreso,
      tablaAnios
    }

    setResultado(dataCalculada)

    if (onActivoGuardado) {
      onActivoGuardado({
        id: activoId,
        nombre: nombreActivo,
        categoriaKey: categoriaSeleccionada.id,
        categoriaNombre: categoriaSeleccionada.nombre,
        costo: vc,
        fechaCompra,
        vidaMeses:
          categoriaSeleccionada.vidaUtilMeses
      })
    }
  }

  const exportarPDF = () => {

    if (!resultado) return

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const primaryColor = [139, 29, 29]
    const darkGray = [40, 40, 40]
    const lightGray = [110, 110, 110]
    const borderColor = [225, 225, 225]
    const cardBg = [253, 250, 250]

    doc.setFillColor(...primaryColor)

    doc.rect(
      0,
      0,
      210,
      4,
      'F'
    )

    try {
      doc.addImage(
        logoFisei,
        'PNG',
        14,
        10,
        18,
        18
      )
    } catch (error) {
      console.log(error)
    }

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(13)

    doc.setTextColor(...primaryColor)

    doc.text(
      'FACULTAD DE INGENIERÍA EN SISTEMAS,',
      36,
      16
    )

    doc.text(
      'ELECTRÓNICA E INDUSTRIAL',
      36,
      21.5
    )

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(9)

    doc.setTextColor(...lightGray)

    doc.text(
      'Sistema de Depreciación de Activos · Normativa Ecuatoriana',
      36,
      26.5
    )

    doc.setDrawColor(...borderColor)

    doc.setLineWidth(0.4)

    doc.line(
      14,
      31,
      196,
      31
    )

    doc.setFillColor(...primaryColor)

    doc.roundedRect(
      14,
      35,
      182,
      9,
      1.5,
      1.5,
      'F'
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(11)

    doc.setTextColor(
      255,
      255,
      255
    )

    doc.text(
      'FICHA INDIVIDUAL DE DEPRECIACIÓN',
      105,
      41,
      {
        align: 'center'
      }
    )

    doc.setFillColor(
      254,
      248,
      248
    )

    doc.roundedRect(
      14,
      48,
      182,
      22,
      2,
      2,
      'F'
    )

    doc.setFillColor(...primaryColor)

    doc.rect(
      14,
      48,
      2.5,
      22,
      'F'
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(8)

    doc.setTextColor(...primaryColor)

    doc.text(
      `${resultado.cat.nombre} · ${resultado.cat.etiqueta}`,
      20,
      53.5
    )

    doc.setFontSize(14)

    doc.setTextColor(...darkGray)

    doc.text(
      resultado.nombreActivo || 'Activo',
      20,
      60.5
    )

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(8.5)

    doc.setTextColor(...lightGray)

    const fechaFormatoCompra =
      resultado.fechaCompra
        .split('-')
        .reverse()
        .join('/')

    const hoyStr =
      new Date().toLocaleDateString(
        'es-EC'
      )

    doc.text(
      'Fecha de compra:',
      20,
      66
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setTextColor(...darkGray)

    doc.text(
      fechaFormatoCompra,
      46,
      66
    )

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setTextColor(...lightGray)

    doc.text(
      'Ficha N°:',
      85,
      66
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setTextColor(...darkGray)

    doc.text(
      'ACT-001',
      99,
      66
    )

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setTextColor(...lightGray)

    doc.text(
      'Emitido:',
      135,
      66
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setTextColor(...darkGray)

    doc.text(
      hoyStr,
      148,
      66
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(10)

    doc.setTextColor(...primaryColor)

    doc.text(
      '1. DATOS DEL ACTIVO',
      14,
      76
    )

    const dibujarTarjetaMetrica = (
      x,
      y,
      w,
      h,
      titulo,
      valor,
      colorValor = darkGray
    ) => {

      doc.setFillColor(...cardBg)

      doc.setDrawColor(...borderColor)

      doc.setLineWidth(0.3)

      doc.roundedRect(
        x,
        y,
        w,
        h,
        2,
        2,
        'FD'
      )

      doc.setFont(
        'helvetica',
        'bold'
      )

      doc.setFontSize(7.5)

      doc.setTextColor(...lightGray)

      doc.text(
        titulo,
        x + 4,
        y + 6
      )

      doc.setFontSize(12)

      doc.setTextColor(...colorValor)

      doc.text(
        valor,
        x + 4,
        y + 13.5
      )
    }

    const cardW = 88.5
    const cardH = 17

    dibujarTarjetaMetrica(
      14,
      80,
      cardW,
      cardH,
      'VALOR DE COMPRA',
      `$${resultado.vc.toFixed(2)}`
    )

    dibujarTarjetaMetrica(
      107.5,
      80,
      cardW,
      cardH,
      `VALOR RESIDUAL (${resultado.cat.porcentajeResidual}%)`,
      `$${resultado.vr.toFixed(2)}`
    )

    dibujarTarjetaMetrica(
      14,
      100,
      cardW,
      cardH,
      'VALOR A DEPRECIAR',
      `$${resultado.vd.toFixed(2)}`
    )

    dibujarTarjetaMetrica(
      107.5,
      100,
      cardW,
      cardH,
      'DEPRECIACIÓN ANUAL',
      `$${resultado.depAnual.toFixed(2)}`,
      primaryColor
    )

    dibujarTarjetaMetrica(
      14,
      120,
      cardW,
      cardH,
      'DEPRECIACIÓN MENSUAL',
      `$${resultado.depMensual.toFixed(2)}`,
      primaryColor
    )

    dibujarTarjetaMetrica(
      107.5,
      120,
      cardW,
      cardH,
      'VIDA ÚTIL',
      `${resultado.mesesTotales} meses`
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(10)

    doc.setTextColor(...primaryColor)

    doc.text(
      '2. TABLA DE DEPRECIACIÓN ANUAL',
      14,
      144
    )

    const columnas = [
      'FECHA',
      'DEPRECIACIÓN DEL AÑO',
      'DEPRECIACIÓN ACUMULADA',
      'VALOR EN LIBROS'
    ]

    const filas =
      resultado.tablaAnios.map(
        (r) => [
          r.fecha.includes('-')
            ? r.fecha
                .split('-')
                .reverse()
                .join('/')
            : r.fecha,
          `$${r.vd.toFixed(2)}`,
          `$${r.vda.toFixed(2)}`,
          `$${r.vr.toFixed(2)}`
        ]
      )

    autoTable(
      doc,
      {
        startY: 147,
        margin: {
          left: 14,
          right: 14
        },
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
          0: {
            halign: 'left',
            fontStyle: 'bold'
          },
          1: {
            halign: 'right'
          },
          2: {
            halign: 'right',
            fontStyle: 'bold',
            textColor: primaryColor
          },
          3: {
            halign: 'right'
          }
        }
      }
    )

    const finalY =
      doc.lastAutoTable.finalY + 8

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(10)

    doc.setTextColor(...primaryColor)

    doc.text(
      '3. ESTADO ACTUAL DEL ACTIVO',
      14,
      finalY
    )

    const boxY = finalY + 4

    doc.setFillColor(
      254,
      250,
      250
    )

    doc.setDrawColor(...borderColor)

    doc.setLineWidth(0.4)

    doc.roundedRect(
      14,
      boxY,
      182,
      45,
      3,
      3,
      'FD'
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(9)

    doc.setTextColor(...primaryColor)

    doc.text(
      `RESUMEN A LA FECHA: ${hoyStr}`,
      20,
      boxY + 8
    )

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(8)

    doc.setTextColor(...lightGray)

    doc.text(
      'Meses depreciados',
      20,
      boxY + 16
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(13)

    doc.setTextColor(...darkGray)

    doc.text(
      `${resultado.mesesTranscurridos} / ${resultado.mesesTotales}`,
      20,
      boxY + 23
    )

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(8)

    doc.setTextColor(...lightGray)

    doc.text(
      'Depreciación acumulada',
      110,
      boxY + 16
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(13)

    doc.setTextColor(...primaryColor)

    doc.text(
      `$${resultado.depAcumuladaHoy.toFixed(2)}`,
      110,
      boxY + 23
    )

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(8)

    doc.setTextColor(...lightGray)

    doc.text(
      'Valor actual en libros',
      20,
      boxY + 30
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(13)

    doc.setTextColor(
      25,
      135,
      84
    )

    doc.text(
      `$${resultado.valorLibrosHoy.toFixed(2)}`,
      20,
      boxY + 37
    )

    const barraY =
      boxY + 45

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(8)

    doc.setTextColor(...lightGray)

    doc.text(
      'Progreso de depreciación',
      20,
      barraY - 1.5
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setTextColor(...darkGray)

    doc.text(
      `${resultado.porcentajeProgreso}%`,
      183,
      barraY - 1.5
    )

    doc.setFillColor(
      235,
      235,
      235
    )

    doc.roundedRect(
      20,
      barraY,
      170,
      3.5,
      1.5,
      1.5,
      'F'
    )

    if (
      resultado.porcentajeProgreso > 0
    ) {

      doc.setFillColor(...primaryColor)

      const anchoProgreso =
        (
          170 *
          resultado.porcentajeProgreso
        ) / 100

      doc.roundedRect(
        20,
        barraY,
        anchoProgreso,
        3.5,
        1.5,
        1.5,
        'F'
      )
    }

    doc.save(
      `Ficha_Depreciacion_${
        (
          resultado.nombreActivo ||
          'Activo'
        ).replace(
          /\s+/g,
          '_'
        )
      }.pdf`
    )
  }

  return (
    <div>

      <div className="calc-card">

        <h3 className="calc-title">
          Parámetros del Activo Fijo
        </h3>

        <form>

          <div className="calc-grid">

            <div>
              <label className="calc-label">
                Nombre del Activo
              </label>

              <div className="calc-input-box">

                <input
                  type="text"
                  className="calc-input"
                  placeholder="Ej. Computadora HP EliteBook"
                  value={nombreActivo}
                  onChange={(e) =>
                    setNombreActivo(
                      e.target.value
                    )
                  }
                />

              </div>
            </div>

            <div>
              <label className="calc-label">
                Categoría Tributaria
              </label>

              <div className="calc-input-box">

                <select
                  className="calc-select"
                  value={tipoActivo}
                  onChange={(e) =>
                    setTipoActivo(
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Seleccione una categoría
                  </option>

                  {categorias.map(
                    (categoria) => (
                      <option
                        key={categoria.id}
                        value={categoria.id}
                      >
                        {categoria.nombre} (
                        {categoria.vidaUtilMeses / 12}
                        {' '}años)
                      </option>
                    )
                  )}

                </select>

              </div>
            </div>

            <div>
              <label className="calc-label">
                Costo de Adquisición ($ USD)
              </label>

              <div className="calc-input-box">

                <input
                  type="number"
                  step="0.01"
                  className="calc-input"
                  placeholder="900.00"
                  value={costoAdquisicion}
                  onChange={(e) =>
                    setCostoAdquisicion(
                      e.target.value
                    )
                  }
                />

              </div>
            </div>

            <div>
              <label className="calc-label">
                Fecha de Adquisición
              </label>

              <div className="calc-input-box">

                <input
                  type="date"
                  className="calc-input"
                  value={fechaCompra}
                  onChange={(e) =>
                    setFechaCompra(
                      e.target.value
                    )
                  }
                />

              </div>
            </div>

          </div>

          <div className="calc-btn-container">

            <button
              type="button"
              className="calc-btn-submit"
              onClick={handleCalcular}
            >
              Calcular Depreciación →
            </button>

          </div>

        </form>

      </div>

      {resultado && (

        <div>

          <div className="calc-metrics">

            <div className="metric-item warning">

              <div className="metric-lbl">
                Valor Residual (
                {resultado.cat.porcentajeResidual}%)
              </div>

              <div
                className="metric-val"
                style={{
                  color: '#d97706'
                }}
              >
                ${resultado.vr.toFixed(2)}
              </div>

            </div>

            <div className="metric-item accent">

              <div className="metric-lbl">
                A Depreciar (VD)
              </div>

              <div
                className="metric-val"
                style={{
                  color: '#94191d'
                }}
              >
                ${resultado.vd.toFixed(2)}
              </div>

            </div>

            <div className="metric-item info">

              <div className="metric-lbl">
                Cuota Mensual
              </div>

              <div
                className="metric-val"
                style={{
                  color: '#0891b2'
                }}
              >
                ${resultado.depMensual.toFixed(2)}
              </div>

            </div>

            <div className="metric-item success">

              <div className="metric-lbl">
                Valor en Libros a Hoy
              </div>

              <div
                className="metric-val"
                style={{
                  color: '#059669'
                }}
              >
                ${resultado.valorLibrosHoy.toFixed(2)}
              </div>

              <div className="metric-sub">
                {resultado.mesesTranscurridos}
                {' '}de{' '}
                {resultado.mesesTotales}
                {' '}meses consumidos
                {' '}({resultado.porcentajeProgreso}%)
              </div>

            </div>

          </div>

          <div className="calc-table-box">

            <div className="table-topbar">

              <div>
                <h4>
                  Tabla Anual de Depreciación
                  {' '}
                  (SRI / Método de Línea Recta)
                </h4>
              </div>

              <button
                type="button"
                onClick={exportarPDF}
                className="btn-download-pdf"
              >
                📄 Descargar Ficha PDF
              </button>

            </div>

            <div className="table-scroll">

              <table className="table-data">

                <thead>

                  <tr>

                    <th
                      style={{
                        textAlign: 'left'
                      }}
                    >
                      Fecha
                    </th>

                    <th
                      style={{
                        textAlign: 'right'
                      }}
                    >
                      Depreciación del Año
                    </th>

                    <th
                      style={{
                        textAlign: 'right'
                      }}
                    >
                      Depreciación Acumulada
                    </th>

                    <th
                      style={{
                        textAlign: 'right'
                      }}
                    >
                      Valor en Libros
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {resultado.tablaAnios.map(
                    (r, i) => (

                      <tr key={i}>

                        <td
                          style={{
                            textAlign: 'left',
                            fontWeight: '500'
                          }}
                        >
                          {r.fecha.includes('-')
                            ? r.fecha
                                .split('-')
                                .reverse()
                                .join('/')
                            : r.fecha}
                        </td>

                        <td
                          style={{
                            textAlign: 'right'
                          }}
                        >
                          ${r.vd.toFixed(2)}
                        </td>

                        <td
                          style={{
                            textAlign: 'right',
                            color: '#94191d',
                            fontWeight: '700'
                          }}
                        >
                          ${r.vda.toFixed(2)}
                        </td>

                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: '800',
                            color: '#1f2937'
                          }}
                        >
                          ${r.vr.toFixed(2)}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}