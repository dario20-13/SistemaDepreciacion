import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoFisei from './assets/logo_Fisei.png'

const numero = (valor) => Number(valor || 0)

const fechaTexto = (fecha) => {
  if (!fecha) return ''

  const limpia = String(fecha).split('T')[0]
  const [anio, mes, dia] = limpia.split('-')

  return `${dia}/${mes}/${anio}`
}

const sumarMeses = (fecha, meses) => {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const nueva = new Date(anio, mes - 1, dia)
  nueva.setMonth(nueva.getMonth() + meses)

  return `${nueva.getFullYear()}-${String(
    nueva.getMonth() + 1
  ).padStart(2, '0')}-${String(
    nueva.getDate()
  ).padStart(2, '0')}`
}

const generarFilasAnuales = (datos) => {
  const filas = [
    [
      fechaTexto(datos.fechaCompra),
      '$0.00',
      '$0.00',
      `$${datos.costoAdquisicion.toFixed(2)}`
    ]
  ]

  const detalle = [...datos.detalle].sort(
    (a, b) => a.numeroPeriodo - b.numeroPeriodo
  )

  if (detalle.length === 0) {
    return filas
  }

  for (
    let inicio = 1;
    inicio <= detalle.length;
    inicio += 12
  ) {
    const bloque = detalle.filter(
      (item) =>
        item.numeroPeriodo >= inicio &&
        item.numeroPeriodo <= inicio + 11
    )

    if (bloque.length === 0) continue

    const ultimo = bloque[bloque.length - 1]

    const depreciacionAnio = bloque.reduce(
      (total, item) => total + numero(item.vd),
      0
    )

    filas.push([
      fechaTexto(ultimo.fecha),
      `$${depreciacionAnio.toFixed(2)}`,
      `$${numero(ultimo.uda).toFixed(2)}`,
      `$${numero(ultimo.vr).toFixed(2)}`
    ])
  }

  return filas
}

export const obtenerDatosDepreciacion = async (
  axios,
  activo,
  fechaHasta = null
) => {
  const token = localStorage.getItem('token')

  if (!token) {
    throw new Error('No existe una sesión activa')
  }

  const activoId =
    activo.id ??
    activo.Id ??
    activo.activoId

  if (!activoId) {
    throw new Error('No se pudo identificar el activo')
  }

  const params = {}

  if (fechaHasta) {
    params.fechaHasta = fechaHasta
  }

  const respuesta = await axios.get(
    `http://localhost:5000/api/depreciacion/activo/${activoId}`,
    {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )

  return respuesta.data
}

export const generarPdfDepreciacion = (
  datosBackend
) => {
  if (!datosBackend) {
    throw new Error(
      'No existen datos para generar el PDF'
    )
  }

  const costoAdquisicion = numero(
    datosBackend.costoAdquisicion
  )

  const valorResidual = numero(
    datosBackend.valorResidual
  )

  const valorDepreciable = numero(
    datosBackend.valorDepreciable
  )

  const depreciacionMensual = numero(
    datosBackend.depreciacionMensual
  )

  const vidaUtilMeses = numero(
    datosBackend.vidaUtilMeses
  )

  const depreciacionAnual =
    depreciacionMensual * 12

  const detalle = (
    datosBackend.detalle || []
  ).map((item) => ({
    numeroPeriodo: numero(item.numeroPeriodo),
    fecha: item.fecha,
    vd: numero(item.vd),
    uda: numero(item.uda),
    vr: numero(item.vr)
  }))

  const ultimoPeriodo =
    detalle.length > 0
      ? detalle[detalle.length - 1]
      : null

  const mesesDepreciados =
    ultimoPeriodo?.numeroPeriodo || 0

  const depreciacionAcumulada =
    ultimoPeriodo?.uda || 0

  const valorActual =
    ultimoPeriodo?.vr ?? costoAdquisicion

  const porcentajeProgreso =
    vidaUtilMeses > 0
      ? Math.min(
          100,
          Math.round(
            (mesesDepreciados /
              vidaUtilMeses) *
              100
          )
        )
      : 0

  const fechaCompra =
    String(datosBackend.fechaCompra)
      .split('T')[0]

  const fechaHasta =
    datosBackend.fechaHasta
      ? String(datosBackend.fechaHasta)
          .split('T')[0]
      : new Date()
          .toISOString()
          .split('T')[0]

  const anios =
    vidaUtilMeses / 12

  const nombreActivo =
    datosBackend.nombreActivo ||
    datosBackend.nombre ||
    'Activo'

  const categoria =
    datosBackend.categoria ||
    'Sin categoría'

  const filasAnuales =
    generarFilasAnuales({
      fechaCompra,
      costoAdquisicion,
      detalle
    })

  const doc =
    new jsPDF('p', 'mm', 'a4')

  doc.setFillColor(148, 25, 29)
  doc.rect(0, 0, 210, 5, 'F')

  try {
    doc.addImage(
      logoFisei,
      'PNG',
      14,
      10,
      16,
      16
    )
  } catch {
    doc.setFillColor(148, 25, 29)
    doc.rect(14, 10, 16, 16, 'F')
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 100, 100)

  doc.text(
    'Sistema de Depreciación de Activos · Normativa Ecuatoriana',
    34,
    20
  )

  doc.setDrawColor(225, 225, 225)
  doc.setLineWidth(0.3)
  doc.line(14, 30, 196, 30)

  doc.setFillColor(148, 25, 29)

  doc.roundedRect(
    14,
    34,
    182,
    9,
    1.5,
    1.5,
    'F'
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(255, 255, 255)

  doc.text(
    'FICHA INDIVIDUAL DE DEPRECIACIÓN',
    105,
    40,
    {
      align: 'center'
    }
  )

  doc.setFillColor(254, 248, 248)

  doc.roundedRect(
    14,
    47,
    182,
    23,
    2,
    2,
    'F'
  )

  doc.setFillColor(148, 25, 29)
  doc.rect(14, 47, 2, 23, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 25, 29)

  doc.text(
    `${categoria.toUpperCase()} · ${anios} AÑOS DE DEPRECIACIÓN`,
    20,
    53
  )

  doc.setFontSize(14)
  doc.setTextColor(20, 20, 20)

  doc.text(
    nombreActivo,
    20,
    61
  )

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  doc.text(
    'Fecha de compra:',
    20,
    66
  )

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)

  doc.text(
    fechaTexto(fechaCompra),
    43,
    66
  )

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  doc.text(
    'Ficha N°:',
    85,
    66
  )

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)

  doc.text(
    `ACT-${String(
      datosBackend.activoId || 0
    ).padStart(3, '0')}`,
    100,
    66
  )

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  doc.text(
    'Emitido:',
    140,
    66
  )

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)

  doc.text(
    fechaTexto(fechaHasta),
    154,
    66
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(148, 25, 29)

  doc.text(
    '1. DATOS DEL ACTIVO',
    14,
    77
  )

  const tarjeta = (
    x,
    y,
    titulo,
    valor,
    rojo = false
  ) => {
    doc.setDrawColor(225, 225, 225)
    doc.setFillColor(255, 255, 255)

    doc.roundedRect(
      x,
      y,
      87,
      13,
      2,
      2,
      'FD'
    )

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(6.5)
    doc.setTextColor(
      100,
      100,
      100
    )

    doc.text(
      titulo,
      x + 4,
      y + 4.5
    )

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(10)

    if (rojo) {
      doc.setTextColor(
        180,
        20,
        25
      )
    } else {
      doc.setTextColor(
        20,
        20,
        20
      )
    }

    doc.text(
      valor,
      x + 4,
      y + 10
    )
  }

  tarjeta(
    14,
    81,
    'VALOR DE COMPRA',
    `$${costoAdquisicion.toFixed(2)}`
  )

  tarjeta(
    109,
    81,
    `VALOR RESIDUAL (${numero(
      datosBackend.valorResidualPorcentaje
    )}%)`,
    `$${valorResidual.toFixed(2)}`
  )

  tarjeta(
    14,
    96,
    'VALOR A DEPRECIAR',
    `$${valorDepreciable.toFixed(2)}`
  )

  tarjeta(
    109,
    96,
    'DEPRECIACIÓN ANUAL',
    `$${depreciacionAnual.toFixed(2)}`,
    true
  )

  tarjeta(
    14,
    111,
    'DEPRECIACIÓN MENSUAL',
    `$${depreciacionMensual.toFixed(2)}`,
    true
  )

  tarjeta(
    109,
    111,
    'VIDA ÚTIL',
    `${vidaUtilMeses} meses`,
    true
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(148, 25, 29)

  doc.text(
    '2. TABLA DE DEPRECIACIÓN ANUAL',
    14,
    132
  )

  autoTable(doc, {
    startY: 136,

    head: [[
      'FECHA',
      'DEPRECIACIÓN DEL AÑO',
      'DEPRECIACIÓN ACUMULADA',
      'VALOR EN LIBROS'
    ]],

    body: filasAnuales,

    theme: 'grid',

    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2.4,
      lineColor: [
        225,
        225,
        225
      ],
      lineWidth: 0.25
    },

    headStyles: {
      fillColor: [
        148,
        25,
        29
      ],
      textColor: [
        255,
        255,
        255
      ],
      fontStyle: 'bold',
      halign: 'center'
    },

    columnStyles: {
      0: {
        halign: 'center',
        cellWidth: 28
      },
      1: {
        halign: 'right'
      },
      2: {
        halign: 'right'
      },
      3: {
        halign: 'right'
      }
    },

    margin: {
      left: 14,
      right: 14
    }
  })

  let yEstado =
    doc.lastAutoTable.finalY + 9

  if (yEstado > 240) {
    doc.addPage()
    yEstado = 20
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(148, 25, 29)

  doc.text(
    '3. ESTADO ACTUAL DEL ACTIVO',
    14,
    yEstado
  )

  doc.setFillColor(254, 248, 248)
  doc.setDrawColor(240, 210, 210)

  doc.roundedRect(
    14,
    yEstado + 4,
    182,
    38,
    2,
    2,
    'FD'
  )

  doc.setFontSize(7)
  doc.setTextColor(148, 25, 29)
  doc.setFont('helvetica', 'bold')

  doc.text(
    `RESUMEN A LA FECHA: ${fechaTexto(
      fechaHasta
    )}`,
    20,
    yEstado + 11
  )

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  doc.text(
    'Meses depreciados',
    20,
    yEstado + 18
  )

  doc.text(
    'Depreciación acumulada',
    94,
    yEstado + 18
  )

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)

  doc.text(
    `${mesesDepreciados} / ${vidaUtilMeses}`,
    20,
    yEstado + 24
  )

  doc.setTextColor(148, 25, 29)

  doc.text(
    `$${depreciacionAcumulada.toFixed(2)}`,
    94,
    yEstado + 24
  )

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  doc.text(
    'Valor actual en libros',
    20,
    yEstado + 30
  )

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(5, 150, 105)

  doc.text(
    `$${valorActual.toFixed(2)}`,
    20,
    yEstado + 36
  )

  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  doc.text(
    'Progreso de depreciación',
    94,
    yEstado + 30
  )

  doc.setFillColor(230, 230, 230)

  doc.roundedRect(
    94,
    yEstado + 33,
    90,
    3,
    1.5,
    1.5,
    'F'
  )

  const anchoProgreso =
    90 *
    (porcentajeProgreso / 100)

  if (anchoProgreso > 0) {
    doc.setFillColor(148, 25, 29)

    doc.roundedRect(
      94,
      yEstado + 33,
      anchoProgreso,
      3,
      1.5,
      1.5,
      'F'
    )
  }

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)

  doc.text(
    `${porcentajeProgreso}%`,
    188,
    yEstado + 36,
    {
      align: 'right'
    }
  )

  const nombreArchivo =
    nombreActivo
      .trim()
      .replace(/\s+/g, '_')

  doc.save(
    `Ficha_Depreciacion_${nombreArchivo}.pdf`
  )
}

export const descargarPdfActivo = async (
  axios,
  activo,
  fechaHasta = null
) => {
  const datos =
    await obtenerDatosDepreciacion(
      axios,
      activo,
      fechaHasta
    )

  generarPdfDepreciacion(datos)
}