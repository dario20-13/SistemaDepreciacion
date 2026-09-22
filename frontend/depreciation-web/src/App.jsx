import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import logoFisei from './assets/logo_Fisei.png'
import CalculadoraDepreciacion from './CalculadoraDepreciacion'
import { descargarPdfActivo } from './generarPdfDepreciacion'

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
          'http://localhost:5000/api/activos',
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
        'http://localhost:5000/api/auth/login',
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
        'http://localhost:5000/api/auth/register',
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
    const token = localStorage.getItem('token')

    if (!token) {
      alert('No existe una sesión activa')
      return
    }

    try {
      const respuesta = await axios.get(
        `http://localhost:5000/api/depreciacion/activo/${activoId}`,
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

      if (error.response?.status === 401) {
        alert('La sesión ha expirado. Inicie sesión nuevamente.')
        return
      }

      if (error.response?.status === 404) {
        alert(
          'Este activo todavía no tiene información de depreciación.'
        )
        return
      }

      alert('No se pudo consultar el detalle del activo.')
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
        `http://localhost:5000/api/activos/${activoId}`,
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
  const emitirPdfDeActivo = async (activo, fechaHasta = null) => {
    if (!activo) {
      alert('Seleccione un activo')
      return
    }

    try {
      await descargarPdfActivo(
        axios,
        activo,
        fechaHasta
      )
    } catch (error) {
      console.error(
        'Error al generar el PDF:',
        error.response?.data || error.message
      )

      if (error.response?.status === 401) {
        alert('La sesión ha expirado. Inicie sesión nuevamente.')
        return
      }

      if (error.response?.status === 404) {
        alert(
          'No existen datos de depreciación para este activo.'
        )
        return
      }

      alert('No se pudo generar el reporte PDF.')
    }
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
                Sistema de Depreciación
              </div>

              <div className="sidebar-subtitle">
                 de Activos
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
            SISTEMA DE DEPRECIACIÓN
          </h2>

          <h2>
            DE ACTIVOS
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

           <div className="register-option">
              ¿No tienes una cuenta?
              <button
                type="button"
                className="register-button"
                onClick={() => {
                  setVista('registro')
                  setError('')
                  setMensajeExito('')
                }}
              >
                Crear cuenta
              </button>
            </div>

          </form>

        ) : (

          <form onSubmit={handleRegister}>

            <div className="form-group">

              <label htmlFor="regNombre">
                Nombre completo
              </label>

              <div className="input-container">

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

            <div className="register-link">
              ¿Ya tienes una cuenta?{' '}
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setMensajeExito('')
                  setVista('login')
                }}
              >
                Iniciar sesión
              </button>
            </div>

          </form>

        )}

      </section>

    </div>
  )
}

export default App
