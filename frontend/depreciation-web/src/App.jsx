import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import logoFisei from './assets/logo_Fisei.png'
import CalculadoraDepreciacion from './CalculadoraDepreciacion'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function App() {
  const [vista, setVista] = useState('login')
  const [menuActivo, setMenuActivo] = useState('registrar')

  const [activosRegistrados, setActivosRegistrados] = useState([])
  const [detalleDepreciacion, setDetalleDepreciacion] = useState(null)

  // Activo seleccionado específicamente para la sección de Reportes PDF
  const [activoSeleccionadoId, setActivoSeleccionadoId] = useState('')

  // Campos de Login / Registro
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [recordarme, setRecordarme] = useState(false)

  const [regNombre, setRegNombre] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [mostrarRegPassword, setMostrarRegPassword] = useState(false)

  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [cargando, setCargando] = useState(false)
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const usuarioGuardado = localStorage.getItem('usuario')

    if (token && usuarioGuardado) {
      setUsuarioAutenticado(JSON.parse(usuarioGuardado))
    }
  }, [])

  useEffect(() => {
    if (!usuarioAutenticado) return

    const cargarActivos = async () => {
      try {
        const token = localStorage.getItem('token')

        const respuesta = await axios.get(
          'http://localhost:5005/api/activos',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const activos = respuesta.data.map((activo) => ({
          id: activo.id,
          nombre: activo.nombre,
          categoriaNombre: activo.categoria,
          costo: activo.costoAdquisicion,
          fechaCompra: activo.fechaCompra.split('T')[0],
          vidaMeses: activo.vidaUtilMeses
        }))

        setActivosRegistrados(activos)
      } catch (error) {
        console.error(
          'Error al cargar activos:',
          error.response?.data || error.message
        )
      }
    }

    cargarActivos()
  }, [usuarioAutenticado])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setMensajeExito('')
    setCargando(true)

    try {
      const respuesta = await axios.post(
        'http://localhost:5028/api/auth/login',
        {
          email: usuario,
          password: password
        }
      )

      localStorage.setItem('token', respuesta.data.token)
      localStorage.setItem('usuario', JSON.stringify(respuesta.data))

      setUsuarioAutenticado(respuesta.data)
    } catch (err) {
      setError(
        err.response?.data
          ? String(err.response.data)
          : 'Credenciales inválidas.'
      )
    } finally {
      setCargando(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setMensajeExito('')
    setCargando(true)

    try {
      await axios.post(
        'http://localhost:5028/api/auth/register',
        {
          nombre: regNombre,
          email: regEmail,
          password: regPassword
        }
      )

      setMensajeExito('Cuenta creada exitosamente. Inicie sesión.')
      setUsuario(regEmail)
      setVista('login')
    } catch (err) {
      setError(
        err.response?.data
          ? String(err.response.data)
          : 'Error al registrar usuario.'
      )
    } finally {
      setCargando(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuarioAutenticado(null)
  }

  const agregarActivo = (nuevoActivo) => {
    setActivosRegistrados((prev) => [
      ...prev,
      nuevoActivo
    ])
  }

  const verDetalleActivo = async (activoId) => {
    try {
      const token = localStorage.getItem('token')

      const respuesta = await axios.get(
        `http://localhost:5045/api/depreciacion/activo/${activoId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setDetalleDepreciacion(respuesta.data)
    } catch (error) {
      console.error(
        'Error al consultar la depreciación:',
        error.response?.data || error.message
      )
    }
  }

  // ELIMINAR ACTIVO
  const eliminarActivo = async (activoId) => {
    const activo = activosRegistrados.find(
      (a) => String(a.id) === String(activoId)
    )

    if (!activo) return

    const confirmar = window.confirm(
      `¿Está seguro de eliminar el activo "${activo.nombre}"?\n\nEsta acción eliminará el activo y sus registros de depreciación.`
    )

    if (!confirmar) return

    try {
      const token = localStorage.getItem('token')

      await axios.delete(
        `http://localhost:5005/api/activos/${activoId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      // Quitar el activo de la lista
      setActivosRegistrados((prev) =>
        prev.filter(
          (a) => String(a.id) !== String(activoId)
        )
      )

      // Cerrar el detalle si estaba abierto
      if (
        detalleDepreciacion &&
        String(detalleDepreciacion.activoId) === String(activoId)
      ) {
        setDetalleDepreciacion(null)
      }

      // Limpiar selección del PDF
      if (
        String(activoSeleccionadoId) === String(activoId)
      ) {
        setActivoSeleccionadoId('')
      }

    } catch (error) {
      console.error(
        'Error al eliminar activo:',
        error.response?.data || error.message
      )

      alert(
        'No se pudo eliminar el activo. Verifique que el servicio esté disponible.'
      )
    }
  }

  // Generador de PDF con diseño institucional FISEI
  const emitirPdfDeActivo = (activo) => {
    if (!activo) return

    const doc = new jsPDF('p', 'mm', 'a4')

    // Cálculos contables normativos
    const vrPorcentaje = 0.10
    const vr = Math.round(activo.costo * vrPorcentaje * 100) / 100
    const vd = Math.round((activo.costo - vr) * 100) / 100
    const vidaMeses = activo.vidaMeses || 36
    const depMensual = vd / vidaMeses
    const depAnual = depMensual * 12

    const [anioStr, mesStr, diaStr] = (activo.fechaCompra || '2025-01-01').split('-')
    const anioCompra = parseInt(anioStr)
    const mesCompra = parseInt(mesStr) || 1
    const diaCompra = diaStr ? diaStr.slice(0, 2) : '01'

    // Fecha actual formateada (DD/MM/AAAA)
    const fechaHoy = new Date()
    const fechaEmisionStr = `${String(fechaHoy.getDate()).padStart(2, '0')}/${String(
      fechaHoy.getMonth() + 1
    ).padStart(2, '0')}/${fechaHoy.getFullYear()}`

    // 1. Franja superior guinda
    doc.setFillColor(148, 25, 29)
    doc.rect(0, 0, 210, 5, 'F')

    // 2. Logo institucional y Encabezado
    try {
      doc.addImage(logoFisei, 'PNG', 14, 10, 16, 16)
    } catch (e) {
      doc.setFillColor(148, 25, 29)
      doc.rect(14, 10, 16, 16, 'F')
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(148, 25, 29)
    doc.text('FACULTAD DE INGENIERÍA EN SISTEMAS,', 34, 15)
    doc.text('ELECTRÓNICA E INDUSTRIAL', 34, 20)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 100, 100)
    doc.text('Sistema de Depreciación de Activos · Normativa Ecuatoriana', 34, 25)

    doc.setDrawColor(225, 225, 225)
    doc.setLineWidth(0.3)
    doc.line(14, 30, 196, 30)

    // 3. Banner FICHA INDIVIDUAL DE DEPRECIACIÓN
    doc.setFillColor(148, 25, 29)
    doc.roundedRect(14, 34, 182, 9, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(255, 255, 255)
    doc.text('FICHA INDIVIDUAL DE DEPRECIACIÓN', 105, 40, { align: 'center' })

    // 4. Tarjeta del Activo Principal
    doc.setFillColor(254, 248, 248)
    doc.roundedRect(14, 47, 182, 23, 2, 2, 'F')
    doc.setFillColor(148, 25, 29)
    doc.rect(14, 47, 2.5, 23, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(148, 25, 29)
    const subtituloCategoria = `${(activo.categoriaNombre || 'EQUIPO').toUpperCase()} · ${(
      vidaMeses / 12
    ).toFixed(0)} AÑOS DE DEPRECIACIÓN`
    doc.text(subtituloCategoria, 20, 53)

    doc.setFontSize(14)
    doc.setTextColor(30, 30, 30)
    doc.text(activo.nombre || 'Activo Fijo', 20, 60)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Fecha de compra: ', 20, 66)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 20, 20)
    doc.text(`${diaCompra}/${mesStr}/${anioCompra}`, 44, 66)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Ficha N°: ', 85, 66)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 20, 20)
    doc.text(`ACT-${String(activo.id || 1).padStart(3, '0')}`, 98, 66)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Emitido: ', 140, 66)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 20, 20)
    doc.text(fechaEmisionStr, 152, 66)

    // 5. SECCIÓN 1: DATOS DEL ACTIVO
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(148, 25, 29)
    doc.text('1. DATOS DEL ACTIVO', 14, 76)

    const drawParamBox = (x, y, w, h, label, val, isWine = false) => {
      doc.setFillColor(252, 252, 253)
      doc.setDrawColor(230, 230, 230)
      doc.setLineWidth(0.3)
      doc.roundedRect(x, y, w, h, 2, 2, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(130, 130, 130)
      doc.text(label.toUpperCase(), x + 4, y + 4.5)

      doc.setFontSize(11)
      if (isWine) {
        doc.setTextColor(148, 25, 29)
      } else {
        doc.setTextColor(20, 20, 20)
      }
      doc.text(val, x + 4, y + 10.5)
    }

    const colW = 89
    const rowH = 13
    drawParamBox(14, 80, colW, rowH, 'Valor de Compra', `$${activo.costo.toFixed(2)}`)
    drawParamBox(107, 80, colW, rowH, 'Valor Residual (10%)', `$${vr.toFixed(2)}`)

    drawParamBox(14, 95, colW, rowH, 'Valor a Depreciar', `$${vd.toFixed(2)}`)
    drawParamBox(107, 95, colW, rowH, 'Depreciación Anual', `$${depAnual.toFixed(2)}`, true)

    drawParamBox(14, 110, colW, rowH, 'Depreciación Mensual', `$${depMensual.toFixed(2)}`, true)
    drawParamBox(107, 110, colW, rowH, 'Vida Útil', `${vidaMeses} meses`, true)

    // 6. SECCIÓN 2: TABLA DE DEPRECIACIÓN ANUAL
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(148, 25, 29)
    doc.text('2. TABLA DE DEPRECIACIÓN ANUAL', 14, 130)

    const tableRows = []
    let cursorAnio = anioCompra
    let vdaActual = 0
    let saldoLibros = activo.costo

    tableRows.push([
      `${diaCompra}/${mesStr}/${cursorAnio}`,
      '$0.00',
      '$0.00',
      `$${saldoLibros.toFixed(2)}`
    ])

    const totalAnios = Math.ceil(vidaMeses / 12)

    for (let anio = 1; anio <= totalAnios; anio++) {
      cursorAnio++
      const depDelPeriodo = anio === totalAnios ? vd - vdaActual : depAnual
      vdaActual += depDelPeriodo
      saldoLibros = Math.max(vr, activo.costo - vdaActual)

      tableRows.push([
        `${diaCompra}/${mesStr}/${cursorAnio}`,
        `$${depDelPeriodo.toFixed(2)}`,
        `$${vdaActual.toFixed(2)}`,
        `$${saldoLibros.toFixed(2)}`
      ])
    }

    autoTable(doc, {
      startY: 134,
      head: [['FECHA', 'DEPRECIACIÓN DEL AÑO', 'DEPRECIACIÓN ACUMULADA', 'VALOR EN LIBROS']],
      body: tableRows,
      theme: 'plain',
      styles: {
        fontSize: 8.5,
        cellPadding: 2.8,
        lineColor: [235, 235, 235],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [148, 25, 29],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'right' },
        2: { halign: 'right', fontStyle: 'bold', textColor: [148, 25, 29] },
        3: { halign: 'right' }
      }
    })

    // 7. SECCIÓN 3: ESTADO ACTUAL DEL ACTIVO
    const finalY = doc.lastAutoTable.finalY + 8

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(148, 25, 29)
    doc.text('3. ESTADO ACTUAL DEL ACTIVO', 14, finalY)

    // Cálculo dinámico de meses transcurridos a la fecha actual
    const fechaInicio = new Date(anioCompra, mesCompra - 1, parseInt(diaCompra))
    let mesesTranscurridos =
      (fechaHoy.getFullYear() - fechaInicio.getFullYear()) * 12 +
      (fechaHoy.getMonth() - fechaInicio.getMonth())

    mesesTranscurridos = Math.max(0, Math.min(vidaMeses, mesesTranscurridos))
    const porcentajeProgreso = Math.min(100, Math.round((mesesTranscurridos / vidaMeses) * 100))
    const vdaHoy = Math.min(vd, Math.round(mesesTranscurridos * depMensual * 100) / 100)
    const saldoHoy = Math.max(vr, Math.round((activo.costo - vdaHoy) * 100) / 100)

    const boxY = finalY + 4
    doc.setFillColor(254, 250, 250)
    doc.setDrawColor(240, 220, 220)
    doc.setLineWidth(0.3)
    doc.roundedRect(14, boxY, 182, 38, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(148, 25, 29)
    doc.text(`RESUMEN A LA FECHA: ${fechaEmisionStr}`, 20, boxY + 7)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(110, 110, 110)
    doc.text('Meses depreciados', 20, boxY + 13)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(20, 20, 20)
    doc.text(`${mesesTranscurridos} / ${vidaMeses}`, 20, boxY + 19)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(110, 110, 110)
    doc.text('Depreciación acumulada', 95, boxY + 13)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(148, 25, 29)
    doc.text(`$${vdaHoy.toFixed(2)}`, 95, boxY + 19)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(110, 110, 110)
    doc.text('Valor actual en libros', 20, boxY + 25)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(22, 130, 60)
    doc.text(`$${saldoHoy.toFixed(2)}`, 20, boxY + 31)

    // Barra de Progreso
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(110, 110, 110)
    doc.text('Progreso de depreciación', 20, boxY + 36)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 20, 20)
    doc.text(`${porcentajeProgreso}%`, 188, boxY + 36, { align: 'right' })

    const barX = 20
    const barY = boxY + 38
    const barW = 168
    const barH = 2.5

    doc.setFillColor(235, 235, 235)
    doc.roundedRect(barX, barY, barW, barH, 1, 1, 'F')

    if (porcentajeProgreso > 0) {
      doc.setFillColor(148, 25, 29)
      const fillW = Math.max(3, (barW * porcentajeProgreso) / 100)
      doc.roundedRect(barX, barY, fillW, barH, 1, 1, 'F')
    }

    doc.save(`Ficha_${(activo.nombre || 'Activo').replace(/\s+/g, '_')}.pdf`)
  }

  // DASHBOARD AUTENTICADO
  if (usuarioAutenticado) {
    const iniciales = usuarioAutenticado.nombre
      ? usuarioAutenticado.nombre
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'DS'

    const activoParaPdf = activosRegistrados.find(
      (a) => String(a.id) === String(activoSeleccionadoId)
    )

    return (
      <div className="dashboard-layout">

        {/* BARRA LATERAL */}
        <aside className="sidebar">

          <div className="sidebar-header">

            <img
              src={logoFisei}
              alt="Logo FISEI"
              className="sidebar-logo"
            />

            <div>

              <div className="sidebar-title">
                Facultad de Ingeniería en Sistemas, Electrónica e Industrial
              </div>

              <div className="sidebar-subtitle">
                Depreciación de Activos
              </div>

            </div>

          </div>

          <div className="sidebar-user">

            <div className="user-avatar">
              {iniciales}
            </div>

            <div>

              <div className="user-name">
                {usuarioAutenticado.nombre || 'Damaris'}
              </div>

              <div className="user-role">
                {usuarioAutenticado.rol || 'Usuario'}
              </div>

            </div>

          </div>

          <nav className="sidebar-nav">

            <div className="nav-section">
              PRINCIPAL
            </div>

            <button
              className={`nav-item ${
                menuActivo === 'dashboard' ? 'active' : ''
              }`}
              onClick={() => setMenuActivo('dashboard')}
            >
              <span>⊞</span> Panel
            </button>

            <button
              className={`nav-item ${
                menuActivo === 'registrar' ? 'active' : ''
              }`}
              onClick={() => setMenuActivo('registrar')}
            >
              <span>＋</span> Registrar Activo
            </button>

            <button
              className={`nav-item ${
                menuActivo === 'lista' ? 'active' : ''
              }`}
              onClick={() => setMenuActivo('lista')}
            >
              <span>☰</span> Lista de Activos

              <span className="nav-badge">
                {activosRegistrados.length}
              </span>

            </button>

            <div className="nav-section">
              INFORMES
            </div>

            <button
              className={`nav-item ${
                menuActivo === 'pdf' ? 'active' : ''
              }`}
              onClick={() => setMenuActivo('pdf')}
            >
              <span>📄</span> Generar PDF
            </button>

            <div className="nav-section">
              CUENTA
            </div>

            <button
              onClick={handleLogout}
              className="nav-item logout"
            >
              <span>↪</span> Cerrar Sesión
            </button>

          </nav>

        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="dashboard-main">

          {/* DASHBOARD */}
          {menuActivo === 'dashboard' && (
            <div>

              <div className="dashboard-header">

                <h1 className="dashboard-title">
                  Resumen General de Activos
                </h1>

                <p className="dashboard-desc">
                  Indicadores globales de los activos registrados
                </p>

              </div>

              <div className="dashboard-stats">

                <div className="stat-card">

                  <div className="stat-icon stat-icon-wine">
                    🗂
                  </div>

                  <div>

                    <div className="stat-label">
                      Activos registrados
                    </div>

                    <div className="stat-value">
                      {activosRegistrados.length}
                    </div>

                    <div className="stat-description">
                      Bienes registrados
                    </div>

                  </div>

                </div>

                <div className="stat-card">

                  <div className="stat-icon stat-icon-blue">
                    💰
                  </div>

                  <div>

                    <div className="stat-label">
                      Valor de adquisición
                    </div>

                    <div className="stat-value">
                      $
                      {activosRegistrados
                        .reduce(
                          (acc, a) =>
                            acc + Number(a.costo || 0),
                          0
                        )
                        .toFixed(2)}
                    </div>

                    <div className="stat-description">
                      Inversión registrada
                    </div>

                  </div>

                </div>

                <div className="stat-card">

                  <div className="stat-icon stat-icon-green">
                    📦
                  </div>

                  <div>

                    <div className="stat-label">
                      Categorías
                    </div>

                    <div className="stat-value">
                      {
                        new Set(
                          activosRegistrados.map(
                            (a) => a.categoriaNombre
                          )
                        ).size
                      }
                    </div>

                    <div className="stat-description">
                      Tipos de activos
                    </div>

                  </div>

                </div>

                <div className="stat-card">

                  <div className="stat-icon stat-icon-purple">
                    📅
                  </div>

                  <div>

                    <div className="stat-label">
                      Último registro
                    </div>

                    <div className="stat-value stat-value-small">
                      {activosRegistrados.length > 0
                        ? activosRegistrados[
                            activosRegistrados.length - 1
                          ].fechaCompra
                        : '--'}
                    </div>

                    <div className="stat-description">
                      Fecha de adquisición
                    </div>

                  </div>

                </div>

              </div>

              <div className="dashboard-sections">

                {/* ACTIVOS POR CATEGORÍA */}
                <div className="dashboard-card">

                  <div className="dashboard-card-header">

                    <div>

                      <h2>
                        Activos por categoría
                      </h2>

                      <p>
                        Distribución de los bienes registrados
                      </p>

                    </div>

                  </div>

                  <div className="category-list">

                    {Object.entries(
                      activosRegistrados.reduce(
                        (grupos, activo) => {

                          const categoria =
                            activo.categoriaNombre ||
                            'Sin categoría'

                          if (!grupos[categoria]) {
                            grupos[categoria] = 0
                          }

                          grupos[categoria]++

                          return grupos

                        },
                        {}
                      )
                    ).map(([categoria, cantidad]) => {

                      const porcentaje =
                        activosRegistrados.length > 0
                          ? (cantidad /
                              activosRegistrados.length) *
                            100
                          : 0

                      return (
                        <div
                          className="category-row"
                          key={categoria}
                        >

                          <div className="category-info">

                            <span className="category-name">
                              {categoria}
                            </span>

                            <span className="category-count">
                              {cantidad}
                            </span>

                          </div>

                          <div className="category-bar">

                            <div
                              className="category-bar-fill"
                              style={{
                                width: `${porcentaje}%`
                              }}
                            ></div>

                          </div>

                          <div className="category-percent">
                            {porcentaje.toFixed(0)}%
                          </div>

                        </div>
                      )
                    })}

                    {activosRegistrados.length === 0 && (
                      <div className="dashboard-empty">
                        Todavía no hay activos registrados.
                      </div>
                    )}

                  </div>

                </div>

                {/* RESUMEN DEL INVENTARIO */}
                <div className="dashboard-card">

                  <div className="dashboard-card-header">

                    <div>

                      <h2>
                        Resumen del inventario
                      </h2>

                      <p>
                        Información general de los activos
                      </p>

                    </div>

                  </div>

                  <div className="inventory-summary">

                    <div className="summary-row">

                      <span>
                        Total de activos
                      </span>

                      <strong>
                        {activosRegistrados.length}
                      </strong>

                    </div>

                    <div className="summary-row">

                      <span>
                        Valor total
                      </span>

                      <strong className="summary-money">
                        $
                        {activosRegistrados
                          .reduce(
                            (acc, a) =>
                              acc + Number(a.costo || 0),
                            0
                          )
                          .toFixed(2)}
                      </strong>

                    </div>

                    <div className="summary-row">

                      <span>
                        Categorías utilizadas
                      </span>

                      <strong>
                        {
                          new Set(
                            activosRegistrados.map(
                              (a) => a.categoriaNombre
                            )
                          ).size
                        }
                      </strong>

                    </div>

                  </div>

                  <div className="summary-note">
                    Los valores corresponden a los activos
                    registrados por el usuario.
                  </div>

                </div>

              </div>

              {/* ÚLTIMOS ACTIVOS */}
              <div className="dashboard-card recent-assets-card">

                <div className="dashboard-card-header">

                  <div>

                    <h2>
                      Últimos activos registrados
                    </h2>

                    <p>
                      Bienes agregados recientemente al sistema
                    </p>

                  </div>

                  <button
                    className="dashboard-link-button"
                    onClick={() => setMenuActivo('lista')}
                  >
                    Ver todos →
                  </button>

                </div>

                {activosRegistrados.length > 0 ? (

                  <div className="recent-assets-list">

                    {activosRegistrados
                      .slice(-5)
                      .reverse()
                      .map((activo) => (

                        <div
                          className="recent-asset"
                          key={activo.id}
                        >

                          <div className="recent-asset-icon">
                            📦
                          </div>

                          <div className="recent-asset-info">

                            <div className="recent-asset-name">
                              {activo.nombre}
                            </div>

                            <div className="recent-asset-category">
                              {activo.categoriaNombre}
                            </div>

                          </div>

                          <div className="recent-asset-date">
                            {activo.fechaCompra}
                          </div>

                          <div className="recent-asset-price">
                            ${Number(activo.costo).toFixed(2)}
                          </div>

                        </div>

                      ))}

                  </div>

                ) : (

                  <div className="dashboard-empty">
                    Todavía no hay activos registrados.
                  </div>

                )}

              </div>

            </div>
          )}

          {/* REGISTRAR ACTIVO */}
          {menuActivo === 'registrar' && (
            <div>

              <div className="dashboard-header">

                <h1 className="dashboard-title">
                  Panel de Control de Depreciación
                </h1>

                <p className="dashboard-desc">
                  Cálculo contable bajo normativa ecuatoriana
                </p>

              </div>

              <CalculadoraDepreciacion
                onActivoGuardado={agregarActivo}
              />

            </div>
          )}

          {/* LISTA DE ACTIVOS */}
          {menuActivo === 'lista' && (
            <div>

              <div className="dashboard-header">

                <h1 className="dashboard-title">
                  Inventario de Activos Registrados
                </h1>

                <p className="dashboard-desc">
                  Listado dinámico de bienes dados de alta en el sistema
                </p>

              </div>

              <div className="calc-table-box">

                <table className="table-data">

                  <thead>

                    <tr>

                      <th>
                        #
                      </th>

                      <th style={{ textAlign: 'left' }}>
                        Nombre del Activo
                      </th>

                      <th>
                        Categoría
                      </th>

                      <th style={{ textAlign: 'right' }}>
                        Costo Inicial
                      </th>

                      <th>
                        Fecha de Compra
                      </th>

                      <th>
                        Acción
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {activosRegistrados.map((item, idx) => (

                      <tr key={item.id}>

                        <td>
                          {idx + 1}
                        </td>

                        <td
                          style={{
                            textAlign: 'left',
                            fontWeight: 'bold'
                          }}
                        >
                          {item.nombre}
                        </td>

                        <td>
                          {item.categoriaNombre}
                        </td>

                        <td
                          style={{
                            textAlign: 'right'
                          }}
                        >
                          ${item.costo.toFixed(2)}
                        </td>

                        <td>
                          {item.fechaCompra}
                        </td>

                        <td>

                          <button
                            onClick={() =>
                              emitirPdfDeActivo(item)
                            }
                          >
                            Descargar PDF
                          </button>

                          <button
                            onClick={() =>
                              verDetalleActivo(item.id)
                            }
                          >
                            Ver detalle
                          </button>

                          <button
                            onClick={() =>
                              eliminarActivo(item.id)
                            }
                          >
                            Eliminar
                          </button>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              {/* DETALLE DEL ACTIVO */}
              {detalleDepreciacion && (

                <div className="detalle-activo">

                  <div className="detalle-header">

                    <div>

                      <div className="detalle-titulo">
                        Historial del activo
                      </div>

                      <div className="detalle-subtitulo">
                        Información principal y parámetros de depreciación
                      </div>

                    </div>

                    <button
                      className="detalle-cerrar"
                      onClick={() =>
                        setDetalleDepreciacion(null)
                      }
                    >
                      ✕
                    </button>

                  </div>

                  <div className="detalle-grid">

                    <div className="detalle-item">

                      <div className="detalle-label">
                        Activo
                      </div>

                      <div className="detalle-valor">
                        {detalleDepreciacion.nombreActivo}
                      </div>

                    </div>

                    <div className="detalle-item">

                      <div className="detalle-label">
                        Categoría
                      </div>

                      <div className="detalle-valor">
                        {detalleDepreciacion.categoria}
                      </div>

                    </div>

                    <div className="detalle-item">

                      <div className="detalle-label">
                        Costo de adquisición
                      </div>

                      <div className="detalle-valor costo">
                        $
                        {Number(
                          detalleDepreciacion.costoAdquisicion
                        ).toFixed(2)}
                      </div>

                    </div>

                    <div className="detalle-item">

                      <div className="detalle-label">
                        Fecha de compra
                      </div>

                      <div className="detalle-valor">
                        {detalleDepreciacion.fechaCompra.split('T')[0]}
                      </div>

                    </div>

                    <div className="detalle-item">

                      <div className="detalle-label">
                        Vida útil
                      </div>

                      <div className="detalle-valor">
                        {detalleDepreciacion.vidaUtilMeses} meses
                      </div>

                    </div>

                    <div className="detalle-item">

                      <div className="detalle-label">
                        Valor residual
                      </div>

                      <div className="detalle-valor">
                        {detalleDepreciacion.valorResidualPorcentaje}%
                      </div>

                    </div>

                  </div>

                  <div className="detalle-resumen">

                    <div>

                      <div className="detalle-label">
                        Períodos generados
                      </div>

                      <div className="detalle-periodos">
                        {detalleDepreciacion.periodosGenerados}
                      </div>

                    </div>

                    <div className="detalle-periodos-texto">
                      Períodos de depreciación registrados
                    </div>

                  </div>

                  <button
                    className="detalle-boton-cerrar"
                    onClick={() =>
                      setDetalleDepreciacion(null)
                    }
                  >
                    Cerrar detalle
                  </button>

                </div>

              )}

            </div>
          )}

          {/* GENERAR PDF */}
          {menuActivo === 'pdf' && (
            <div>

              <div className="dashboard-header">

                <h1 className="dashboard-title">
                  Generación de Reporte en PDF
                </h1>

                <p className="dashboard-desc">
                  Seleccione el activo para exportar su informe oficial tributario
                </p>

              </div>

              <div
                className="calc-card"
                style={{ maxWidth: '600px' }}
              >

                <label
                  className="calc-label"
                  style={{ fontSize: '13px' }}
                >
                  Seleccione el activo a exportar:
                </label>

                <div
                  className="calc-input-box"
                  style={{ marginTop: '8px' }}
                >

                  <select
                    className="calc-select"
                    value={activoSeleccionadoId}
                    onChange={(e) =>
                      setActivoSeleccionadoId(e.target.value)
                    }
                  >

                    <option value="">
                      -- Seleccione un activo de la lista --
                    </option>

                    {activosRegistrados.map((a) => (

                      <option
                        key={a.id}
                        value={a.id}
                      >
                        {a.nombre} (${a.costo.toFixed(2)}) - {a.fechaCompra}
                      </option>

                    ))}

                  </select>

                </div>

                {activoParaPdf && (

                  <div
                    style={{
                      marginTop: '20px',
                      padding: '16px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #eee'
                    }}
                  >

                    <div
                      style={{
                        fontSize: '13px',
                        color: '#444',
                        marginBottom: '6px'
                      }}
                    >
                      <strong>
                        Activo:
                      </strong>{' '}
                      {activoParaPdf.nombre}
                    </div>

                    <div
                      style={{
                        fontSize: '13px',
                        color: '#444',
                        marginBottom: '6px'
                      }}
                    >
                      <strong>
                        Categoría:
                      </strong>{' '}
                      {activoParaPdf.categoriaNombre}
                    </div>

                    <div
                      style={{
                        fontSize: '13px',
                        color: '#444',
                        marginBottom: '14px'
                      }}
                    >
                      <strong>
                        Costo:
                      </strong>{' '}
                      ${activoParaPdf.costo.toFixed(2)}
                      {' '}
                      (Fecha: {activoParaPdf.fechaCompra})
                    </div>

                    <button
                      onClick={() =>
                        emitirPdfDeActivo(activoParaPdf)
                      }
                      className="calc-btn-submit"
                      style={{ width: '100%' }}
                    >
                      📄 Generar y Descargar Reporte PDF
                    </button>

                  </div>

                )}

              </div>

            </div>
          )}

        </main>

      </div>
    )
  }

  // LOGIN / REGISTRO
  return (

    <div className="login-page">

      <div className="decoration decoration-top-left"></div>
      <div className="decoration decoration-bottom-right"></div>

      <div className="watermark">
        <img
          src={logoFisei}
          alt=""
        />
      </div>

      <section className="login-card">

        <div className="login-header">

          <img
            src={logoFisei}
            alt="Logo FISEI"
            className="login-logo"
          />

          <h2>
            FACULTAD DE INGENIERÍA EN SISTEMAS,
          </h2>

          <h2>
            ELECTRÓNICA E INDUSTRIAL
          </h2>

          <div className="separator">
            <span></span>
            <b>◆</b>
            <span></span>
          </div>

          <h1>
            {vista === 'login'
              ? 'Iniciar Sesión'
              : 'Crear Cuenta'}
          </h1>

          <p>
            {vista === 'login'
              ? 'Accede al sistema con tus credenciales'
              : 'Ingresa tus datos para registrarte'}
          </p>

        </div>

        {mensajeExito && (

          <div
            style={{
              backgroundColor: '#e6ffed',
              color: '#155724',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '15px'
            }}
          >
            {mensajeExito}
          </div>

        )}

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {vista === 'login' ? (

          <form onSubmit={handleLogin}>

            <div className="form-group">

              <label htmlFor="usuario">
                Correo electrónico
              </label>

              <div className="input-container">

                <span className="input-icon">
                  ♙
                </span>

                <input
                  id="usuario"
                  type="email"
                  value={usuario}
                  onChange={(e) =>
                    setUsuario(e.target.value)
                  }
                  placeholder="usuario@ejemplo.com"
                  required
                />

              </div>

            </div>

            <div className="form-group">

              <label htmlFor="password">
                Contraseña
              </label>

              <div className="input-container">

                <span className="input-icon">
                  ♧
                </span>

                <input
                  id="password"
                  type={
                    mostrarPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Ingrese su contraseña"
                  required
                />

                <button
                  type="button"
                  className="password-button"
                  onClick={() =>
                    setMostrarPassword(
                      !mostrarPassword
                    )
                  }
                >
                  {mostrarPassword
                    ? '◉'
                    : '◌'}
                </button>

              </div>

            </div>

            <div className="login-options">

              <label className="remember">

                <input
                  type="checkbox"
                  checked={recordarme}
                  onChange={(e) =>
                    setRecordarme(
                      e.target.checked
                    )
                  }
                />

                <span>
                  Recordarme
                </span>

              </label>

              <button
                type="button"
                className="forgot-password"
              >
                ¿Olvidó su contraseña?
              </button>

            </div>

            <button
              type="submit"
              className="login-button"
              disabled={cargando}
            >

              <span>
                {cargando
                  ? 'Ingresando...'
                  : 'Ingresar'}
              </span>

              <span className="arrow">
                →
              </span>

            </button>

          </form>

        ) : (

          <form onSubmit={handleRegister}>

            <div className="form-group">

              <label htmlFor="regNombre">
                Nombre completo
              </label>

              <div className="input-container">

                <span className="input-icon">
                  👤
                </span>

                <input
                  id="regNombre"
                  type="text"
                  value={regNombre}
                  onChange={(e) =>
                    setRegNombre(
                      e.target.value
                    )
                  }
                  placeholder="Nombre y apellido"
                  required
                />

              </div>

            </div>

            <div className="form-group">

              <label htmlFor="regEmail">
                Correo electrónico
              </label>

              <div className="input-container">

                <span className="input-icon">
                  ♙
                </span>

                <input
                  id="regEmail"
                  type="email"
                  value={regEmail}
                  onChange={(e) =>
                    setRegEmail(
                      e.target.value
                    )
                  }
                  placeholder="correo@ejemplo.com"
                  required
                />

              </div>

            </div>

            <div className="form-group">

              <label htmlFor="regPassword">
                Contraseña
              </label>

              <div className="input-container">

                <span className="input-icon">
                  ♧
                </span>

                <input
                  id="regPassword"
                  type={
                    mostrarRegPassword
                      ? 'text'
                      : 'password'
                  }
                  value={regPassword}
                  onChange={(e) =>
                    setRegPassword(
                      e.target.value
                    )
                  }
                  placeholder="Mínimo 6 caracteres"
                  required
                />

              </div>

            </div>

            <button
              type="submit"
              className="login-button"
              disabled={cargando}
            >

              <span>
                {cargando
                  ? 'Registrando...'
                  : 'Registrarse'}
              </span>

              <span className="arrow">
                →
              </span>

            </button>

          </form>

        )}

      </section>

    </div>
  )
}

export default App