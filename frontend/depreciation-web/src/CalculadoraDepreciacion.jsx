import { useEffect, useState } from 'react'
import axios from 'axios'
import './CalculadoraDepreciacion.css'
import { generarPdfDepreciacion } from './generarPdfDepreciacion'

export default function CalculadoraDepreciacion({ onActivoGuardado }) {
  const [nombreActivo, setNombreActivo] = useState('')
  const [tipoActivo, setTipoActivo] = useState('')
  const [costoAdquisicion, setCostoAdquisicion] = useState('')
  const [fechaCompra, setFechaCompra] = useState('')
  const [fechaHasta, setFechaHasta] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [resultado, setResultado] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const token = localStorage.getItem('token')

        const respuesta = await axios.get(
          'http://localhost:5000/api/categorias',
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

    if (!fechaHasta) {
      alert('Seleccione la fecha de corte para la depreciación')
      return
    }

    if (new Date(fechaHasta) < new Date(fechaCompra)) {
      alert(
        'La fecha hasta no puede ser anterior a la fecha de adquisición'
      )
      return
    }

    if (!tipoActivo) {
      alert('Seleccione una categoría')
      return
    }

    const categoriaSeleccionada = categorias.find(
      (categoria) => categoria.id === Number(tipoActivo)
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

    setCargando(true)

    try {
      const respuestaActivo = await axios.post(
        'http://localhost:5000/api/activos',
        {
          categoriaId: categoriaSeleccionada.id,
          nombre: nombreActivo.trim(),
          costoAdquisicion: vc,
          fechaCompra
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const activoId =
        respuestaActivo.data.id ??
        respuestaActivo.data.Id ??
        respuestaActivo.data.activoId

      if (!activoId) {
        alert('El backend no devolvió el ID del activo')
        return
      }

      const respuestaDepreciacion = await axios.post(
        'http://localhost:5000/api/depreciacion/calcular',
        {
          activoId: Number(activoId),
          fechaHasta
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const datosBackend = respuestaDepreciacion.data

      const ultimoPeriodo =
        datosBackend.detalle &&
        datosBackend.detalle.length > 0
          ? datosBackend.detalle[
              datosBackend.detalle.length - 1
            ]
          : null

      const mesesTranscurridos = Math.min(
        Number(datosBackend.periodosSolicitados || 0),
        Number(datosBackend.vidaUtilMeses || 0)
      )

      const depAcumuladaHoy = ultimoPeriodo
        ? Number(ultimoPeriodo.uda)
        : 0

      const valorLibrosHoy = ultimoPeriodo
        ? Number(ultimoPeriodo.vr)
        : Number(datosBackend.costoAdquisicion)

      const porcentajeProgreso =
        Number(datosBackend.vidaUtilMeses) > 0
          ? Math.min(
              100,
              Math.round(
                (mesesTranscurridos /
                  Number(datosBackend.vidaUtilMeses)) *
                  100
              )
            )
          : 0

      const tablaPeriodos = [
        {
          numeroPeriodo: 0,
          fecha: datosBackend.fechaCompra.split('T')[0],
          vd: 0,
          vda: 0,
          vr: Number(datosBackend.costoAdquisicion)
        },
        ...(datosBackend.detalle || []).map((periodo) => ({
          numeroPeriodo: periodo.numeroPeriodo,
          fecha: periodo.fecha.split('T')[0],
          vd: Number(periodo.vd),
          vda: Number(periodo.uda),
          vr: Number(periodo.vr)
        }))
      ]

      const dataCalculada = {
        activoId: Number(datosBackend.activoId),
        nombreActivo: datosBackend.nombreActivo,

        vc: Number(datosBackend.costoAdquisicion),
        vr: Number(datosBackend.valorResidual),
        vd: Number(datosBackend.valorDepreciable),

        depMensual: Number(
          datosBackend.depreciacionMensual
        ),

        depAnual:
          Number(datosBackend.depreciacionMensual) * 12,

        cat: {
          nombre: datosBackend.categoria,
          etiqueta: `${
            Number(datosBackend.vidaUtilMeses) / 12
          } AÑOS DE DEPRECIACIÓN`,
          anios:
            Number(datosBackend.vidaUtilMeses) / 12,
          mesesTotales: Number(
            datosBackend.vidaUtilMeses
          ),
          porcentajeResidual: Number(
            datosBackend.valorResidualPorcentaje
          )
        },

        fechaCompra:
          datosBackend.fechaCompra.split('T')[0],

        fechaHasta:
          datosBackend.fechaHasta.split('T')[0],

        mesesTranscurridos,

        mesesTotales: Number(
          datosBackend.vidaUtilMeses
        ),

        depAcumuladaHoy,
        valorLibrosHoy,
        porcentajeProgreso,
        tablaPeriodos
      }

      setResultado(dataCalculada)

      if (onActivoGuardado) {
        onActivoGuardado({
          id: Number(datosBackend.activoId),
          nombre: datosBackend.nombreActivo,
          categoriaKey: categoriaSeleccionada.id,
          categoriaNombre: datosBackend.categoria,
          costo: Number(datosBackend.costoAdquisicion),
          fechaCompra:
            datosBackend.fechaCompra.split('T')[0],
          vidaMeses: Number(
            datosBackend.vidaUtilMeses
          )
        })
      }
    } catch (error) {
      console.error(
        'Error al registrar o calcular el activo:',
        error.response?.data || error.message
      )

      if (error.response?.status === 401) {
        alert(
          'La sesión ha expirado. Inicie sesión nuevamente.'
        )
        return
      }

      alert(
        error.response?.data?.message ||
          error.response?.data?.title ||
          (typeof error.response?.data === 'string'
            ? error.response.data
            : null) ||
          'No se pudo registrar o calcular la depreciación'
      )
    } finally {
      setCargando(false)
    }
  }

  const exportarPDF = () => {
    if (!resultado) {
      alert('Primero debe calcular la depreciación')
      return
    }

    try {
      const datosPdf = {
        activoId: resultado.activoId,
        nombreActivo: resultado.nombreActivo,
        costoAdquisicion: resultado.vc,
        fechaCompra: resultado.fechaCompra,
        categoria: resultado.cat.nombre,
        vidaUtilMeses: resultado.mesesTotales,
        valorResidualPorcentaje:
          resultado.cat.porcentajeResidual,
        fechaHasta: resultado.fechaHasta,
        valorResidual: resultado.vr,
        valorDepreciable: resultado.vd,
        depreciacionMensual: resultado.depMensual,
        detalle: resultado.tablaPeriodos
          .filter(
            (periodo) =>
              periodo.numeroPeriodo !== 0
          )
          .map((periodo) => ({
            numeroPeriodo: periodo.numeroPeriodo,
            fecha: periodo.fecha,
            vd: periodo.vd,
            uda: periodo.vda,
            vr: periodo.vr
          }))
      }

      generarPdfDepreciacion(datosPdf)
    } catch (error) {
      console.error(
        'Error al generar PDF:',
        error
      )

      alert('No se pudo generar el reporte PDF.')
    }
  }

  const tablaAnual = []

  if (resultado) {
    tablaAnual.push({
      anio: 0,
      fecha: resultado.fechaCompra,
      depreciacion: 0,
      acumulada: 0,
      valorLibros: resultado.vc
    })

    const periodosMensuales = resultado.tablaPeriodos
      .filter((periodo) => periodo.numeroPeriodo !== 0)
      .sort((a, b) => a.numeroPeriodo - b.numeroPeriodo)

    if (periodosMensuales.length > 0) {
      const ultimoNumeroPeriodo =
        periodosMensuales[periodosMensuales.length - 1].numeroPeriodo

      let numeroAnio = 1

      for (
        let inicioPeriodo = 1;
        inicioPeriodo <= ultimoNumeroPeriodo;
        inicioPeriodo += 12
      ) {
        const finPeriodo = Math.min(
          inicioPeriodo + 11,
          ultimoNumeroPeriodo
        )

        const periodosDelAnio = periodosMensuales.filter(
          (periodo) =>
            periodo.numeroPeriodo >= inicioPeriodo &&
            periodo.numeroPeriodo <= finPeriodo
        )

        if (periodosDelAnio.length === 0) {
          continue
        }

        const ultimoPeriodo =
          periodosDelAnio[periodosDelAnio.length - 1]

        const depreciacionDelAnio =
          periodosDelAnio.reduce(
            (total, periodo) =>
              total + Number(periodo.vd || 0),
            0
          )

        tablaAnual.push({
          anio: numeroAnio,
          fecha: ultimoPeriodo.fecha,
          depreciacion: Number(
            depreciacionDelAnio.toFixed(2)
          ),
          acumulada: Number(ultimoPeriodo.vda || 0),
          valorLibros: Number(ultimoPeriodo.vr || 0)
        })

        numeroAnio++
      }
    }
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
                    setNombreActivo(e.target.value)
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
                    setTipoActivo(e.target.value)
                  }
                >
                  <option value="">
                    Seleccione una categoría
                  </option>

                  {categorias.map((categoria) => (
                    <option
                      key={categoria.id}
                      value={categoria.id}
                    >
                      {categoria.nombre} (
                      {categoria.vidaUtilMeses / 12} años)
                    </option>
                  ))}
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
                  min="0.01"
                  className="calc-input"
                  placeholder="900.00"
                  value={costoAdquisicion}
                  onChange={(e) =>
                    setCostoAdquisicion(e.target.value)
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
                    setFechaCompra(e.target.value)
                  }
                />
              </div>
            </div>

            <div>
              <label className="calc-label">
                Depreciar Hasta (Fecha de Corte)
              </label>

              <div className="calc-input-box">
                <input
                  type="date"
                  className="calc-input"
                  value={fechaHasta}
                  onChange={(e) =>
                    setFechaHasta(e.target.value)
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
              disabled={cargando}
            >
              {cargando
                ? 'Calculando...'
                : 'Calcular Depreciación →'}
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
                style={{ color: '#d97706' }}
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
                style={{ color: '#94191d' }}
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
                style={{ color: '#0891b2' }}
              >
                ${resultado.depMensual.toFixed(2)}
              </div>
            </div>

            <div className="metric-item success">
              <div className="metric-lbl">
                Valor en Libros al{' '}
                {resultado.fechaHasta
                  .split('-')
                  .reverse()
                  .join('/')}
              </div>

              <div
                className="metric-val"
                style={{ color: '#059669' }}
              >
                ${resultado.valorLibrosHoy.toFixed(2)}
              </div>

              <div className="metric-sub">
                {resultado.mesesTranscurridos} de{' '}
                {resultado.mesesTotales} meses consumidos (
                {resultado.porcentajeProgreso}%)
              </div>
            </div>
          </div>

          <div className="calc-table-box">
            <div className="table-topbar">
              <div>
                <h4>
                  Tabla de Depreciación Anual (Método de Línea Recta)
                </h4>
              </div>

              <button
                type="button"
                onClick={exportarPDF}
                className="btn-download-pdf"
              >
                Descargar Ficha PDF
              </button>
            </div>

            <div className="table-scroll">
              <table className="table-data">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>
                      Período
                    </th>

                    <th style={{ textAlign: 'left' }}>
                      Fecha
                    </th>

                    <th style={{ textAlign: 'right' }}>
                      Depreciación
                    </th>

                    <th style={{ textAlign: 'right' }}>
                      Depreciación Acumulada
                    </th>

                    <th style={{ textAlign: 'right' }}>
                      Valor en Libros
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {tablaAnual.map((fila) => (
                    <tr key={fila.anio}>
                      <td
                        style={{
                          textAlign: 'center',
                          fontWeight: '600'
                        }}
                      >
                        {fila.anio === 0
                          ? 'Inicial'
                          : fila.anio}
                      </td>

                      <td
                        style={{
                          textAlign: 'left',
                          fontWeight: '500'
                        }}
                      >
                        {fila.fecha
                          .split('T')[0]
                          .split('-')
                          .reverse()
                          .join('/')}
                      </td>

                      <td
                        style={{
                          textAlign: 'right'
                        }}
                      >
                        ${fila.depreciacion.toFixed(2)}
                      </td>

                      <td
                        style={{
                          textAlign: 'right',
                          color: '#94191d',
                          fontWeight: '700'
                        }}
                      >
                        ${fila.acumulada.toFixed(2)}
                      </td>

                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: '800',
                          color: '#1f2937'
                        }}
                      >
                        ${fila.valorLibros.toFixed(2)}
                      </td>
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