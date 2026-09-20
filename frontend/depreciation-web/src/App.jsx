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

  // Lista dinámica de activos registrados en la sesión
  const [activosRegistrados, setActivosRegistrados] = useState([
    {
      id: 1,
      nombre: 'Computadora Dell OptiPlex',
      categoriaKey: 'computo',
      categoriaNombre: 'Equipos de Cómputo / Muebles (3 años)',
      costo: 900.0,
      fechaCompra: '2022-05-01',
      vidaMeses: 36
    }
  ])

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

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setMensajeExito('')
    setCargando(true)

    try {
      const respuesta = await axios.post(
        'http://localhost:5028/api/auth/login',
        { email: usuario, password: password }
      )
      localStorage.setItem('token', respuesta.data.token)
      localStorage.setItem('usuario', JSON.stringify(respuesta.data))
      setUsuarioAutenticado(respuesta.data)
    } catch (err) {
      setError(err.response?.data ? String(err.response.data) : 'Credenciales inválidas.')
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
        { nombre: regNombre, email: regEmail, password: regPassword }
      )
      setMensajeExito('Cuenta creada exitosamente. Inicie sesión.')
      setUsuario(regEmail)
      setVista('login')
    } catch (err) {
      setError(err.response?.data ? String(err.response.data) : 'Error al registrar usuario.')
    } finally {
      setCargando(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuarioAutenticado(null)
  }

  // Guardar un activo nuevo cuando se calcula en el componente Calculadora
  const agregarActivo = (nuevoActivo) => {
    setActivosRegistrados((prev) => [
      ...prev,
      { ...nuevoActivo, id: prev.length + 1 }
    ])
  }

  // Generador de PDF bajo demanda en la pestaña "Generar PDF"
  const emitirPdfDeActivo = (activo) => {
    if (!activo) return

    const vr = Math.round(activo.costo * 0.10 * 100) / 100
    const vd = Math.round((activo.costo - vr) * 100) / 100
    const depMensual = vd / activo.vidaMeses

    const [anioStr, mesStr] = activo.fechaCompra.split('-')
    const anioCompra = parseInt(anioStr)
    const mesCompra = parseInt(mesStr)

    const doc = new jsPDF()

    doc.setFillColor(148, 25, 29)
    doc.rect(0, 0, 210, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('REPORTE OFICIAL DE DEPRECIACIÓN', 14, 14)

    doc.setTextColor(50, 50, 50)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Activo: ${activo.nombre} | Categoría: ${activo.categoriaNombre}`, 14, 30)
    doc.text(`Fecha Adquisición: ${activo.fechaCompra} | Valor Compra: $${activo.costo.toFixed(2)}`, 14, 36)
    doc.text(`Valor Residual (10%): $${vr.toFixed(2)} | Valor Depreciable: $${vd.toFixed(2)}`, 14, 42)
    doc.text(`Depreciación Mensual: $${depMensual.toFixed(2)} / mes`, 14, 48)

    // Armar tabla anual proporcional
    const filas = []
    let mesesRestantes = activo.vidaMeses
    let anioCursor = anioCompra
    let vdaAcumulada = 0
    let vrRestante = activo.costo

    filas.push([0, activo.fechaCompra, '-', '$0.00', '$0.00', `$${activo.costo.toFixed(2)}`, 'Adquisición'])

    let p = 1
    while (mesesRestantes > 0) {
      let mesesAnio = (anioCursor === anioCompra)
        ? Math.min(13 - mesCompra, mesesRestantes)
        : Math.min(12, mesesRestantes)

      const vdAnio = Math.round(mesesAnio * depMensual * 100) / 100
      vdaAcumulada = Math.min(vd, Math.round((vdaAcumulada + vdAnio) * 100) / 100)
      vrRestante = Math.max(vr, Math.round((activo.costo - vdaAcumulada) * 100) / 100)
      mesesRestantes -= mesesAnio

      filas.push([
        p,
        `31/12/${anioCursor}`,
        `${mesesAnio} m`,
        `$${vdAnio.toFixed(2)}`,
        `$${vdaAcumulada.toFixed(2)}`,
        `$${vrRestante.toFixed(2)}`,
        mesesAnio === 12 ? 'Año Completo' : `Proporcional (${mesesAnio} m)`
      ])
      p++
      anioCursor++
    }

    filas.push([p, `31/12/${anioCursor}`, '-', '$0.00', `$${vd.toFixed(2)}`, `$${vr.toFixed(2)}`, 'Valor Residual (10%)'])

    autoTable(doc, {
      startY: 54,
      head: [['#', 'Fecha / Corte', 'Meses', 'Deprec. Año (VD)', 'Deprec. Acum. (VDA)', 'Saldo Restante', 'Estado']],
      body: filas,
      theme: 'striped',
      headStyles: { fillColor: [148, 25, 29] },
      styles: { fontSize: 8.5, halign: 'center' },
      columnStyles: {
        1: { halign: 'left' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'left' }
      }
    })

    doc.save(`depreciacion_${activo.nombre.replace(/\s+/g, '_')}.pdf`)
  }

  // 1. DASHBOARD AUTENTICADO
  if (usuarioAutenticado) {
    const iniciales = usuarioAutenticado.nombre
      ? usuarioAutenticado.nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
      : 'DS'

    const activoParaPdf = activosRegistrados.find(a => String(a.id) === String(activoSeleccionadoId))

    return (
      <div className="dashboard-layout">
        {/* BARRA LATERAL */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <img src={logoFisei} alt="Logo FISEI" className="sidebar-logo" />
            <div>
              <div className="sidebar-title">
                Facultad de Ingeniería en Sistemas, Electrónica e Industrial
              </div>
              <div className="sidebar-subtitle">Depreciación de Activos</div>
            </div>
          </div>

          <div className="sidebar-user">
            <div className="user-avatar">{iniciales}</div>
            <div>
              <div className="user-name">{usuarioAutenticado.nombre || 'Damaris'}</div>
              <div className="user-role">{usuarioAutenticado.rol || 'Usuario'}</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section">PRINCIPAL</div>
            <button
              className={`nav-item ${menuActivo === 'dashboard' ? 'active' : ''}`}
              onClick={() => setMenuActivo('dashboard')}
            >
              <span>⊞</span> Panel
            </button>
            <button
              className={`nav-item ${menuActivo === 'registrar' ? 'active' : ''}`}
              onClick={() => setMenuActivo('registrar')}
            >
              <span>＋</span> Registrar Activo
            </button>
            <button
              className={`nav-item ${menuActivo === 'lista' ? 'active' : ''}`}
              onClick={() => setMenuActivo('lista')}
            >
              <span>☰</span> Lista de Activos
              {/* El número de la insignia es dinámico */}
              <span className="nav-badge">{activosRegistrados.length}</span>
            </button>

            <div className="nav-section">INFORMES</div>
            <button
              className={`nav-item ${menuActivo === 'pdf' ? 'active' : ''}`}
              onClick={() => setMenuActivo('pdf')}
            >
              <span>📄</span> Generar PDF
            </button>

            <div className="nav-section">CUENTA</div>
            <button onClick={handleLogout} className="nav-item logout">
              <span>↪</span> Cerrar Sesión
            </button>
          </nav>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="dashboard-main">
          {/* VISTA 1: DASHBOARD */}
          {menuActivo === 'dashboard' && (
            <div>
              <div className="dashboard-header">
                <h1 className="dashboard-title">Resumen General de Activos</h1>
                <p className="dashboard-desc">Indicadores globales de los activos registrados</p>
              </div>
              <div className="calc-metrics">
                <div className="metric-item accent">
                  <div className="metric-lbl">Activos Registrados</div>
                  <div className="metric-val" style={{ color: '#94191d' }}>{activosRegistrados.length}</div>
                </div>
                <div className="metric-item info">
                  <div className="metric-lbl">Total Costo de Adquisición</div>
                  <div className="metric-val" style={{ color: '#0891b2' }}>
                    ${activosRegistrados.reduce((acc, a) => acc + a.costo, 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: REGISTRAR Y CALCULAR ACTIVO */}
          {menuActivo === 'registrar' && (
            <div>
              <div className="dashboard-header">
                <h1 className="dashboard-title">Panel de Control de Depreciación</h1>
                <p className="dashboard-desc">
                  Cálculo contable bajo normativa ecuatoriana
                </p>
              </div>
              <CalculadoraDepreciacion onActivoGuardado={agregarActivo} />
            </div>
          )}

          {/* VISTA 3: LISTA REAL DE ACTIVOS */}
          {menuActivo === 'lista' && (
            <div>
              <div className="dashboard-header">
                <h1 className="dashboard-title">Inventario de Activos Registrados</h1>
                <p className="dashboard-desc">Listado dinámico de bienes dados de alta en el sistema</p>
              </div>
              <div className="calc-table-box">
                <table className="table-data">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th style={{ textAlign: 'left' }}>Nombre del Activo</th>
                      <th>Categoría</th>
                      <th style={{ textAlign: 'right' }}>Costo Inicial</th>
                      <th>Fecha de Compra</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activosRegistrados.map((item, idx) => (
                      <tr key={item.id}>
                        <td>{idx + 1}</td>
                        <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{item.nombre}</td>
                        <td>{item.categoriaNombre}</td>
                        <td style={{ textAlign: 'right' }}>${item.costo.toFixed(2)}</td>
                        <td>{item.fechaCompra}</td>
                        <td>
                          <button
                            onClick={() => emitirPdfDeActivo(item)}
                            className="btn-download-pdf"
                            style={{ margin: '0 auto', fontSize: '11.5px', padding: '6px 12px' }}
                          >
                            Descargar PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA 4: GENERAR PDF CON SELECTOR */}
          {menuActivo === 'pdf' && (
            <div>
              <div className="dashboard-header">
                <h1 className="dashboard-title">Generación de Reporte en PDF</h1>
                <p className="dashboard-desc">Seleccione el activo para exportar su informe oficial tributario</p>
              </div>

              <div className="calc-card" style={{ maxWidth: '600px' }}>
                <label className="calc-label" style={{ fontSize: '13px' }}>
                  Seleccione el activo a exportar:
                </label>
                <div className="calc-input-box" style={{ marginTop: '8px' }}>
                  <select
                    className="calc-select"
                    value={activoSeleccionadoId}
                    onChange={(e) => setActivoSeleccionadoId(e.target.value)}
                  >
                    <option value="">-- Seleccione un activo de la lista --</option>
                    {activosRegistrados.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} (${a.costo.toFixed(2)}) - {a.fechaCompra}
                      </option>
                    ))}
                  </select>
                </div>

                {activoParaPdf && (
                  <div style={{ marginTop: '20px', padding: '16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #eee' }}>
                    <div style={{ fontSize: '13px', color: '#444', marginBottom: '6px' }}>
                      <strong>Activo:</strong> {activoParaPdf.nombre}
                    </div>
                    <div style={{ fontSize: '13px', color: '#444', marginBottom: '6px' }}>
                      <strong>Categoría:</strong> {activoParaPdf.categoriaNombre}
                    </div>
                    <div style={{ fontSize: '13px', color: '#444', marginBottom: '14px' }}>
                      <strong>Costo:</strong> ${activoParaPdf.costo.toFixed(2)} (Fecha: {activoParaPdf.fechaCompra})
                    </div>
                    <button
                      onClick={() => emitirPdfDeActivo(activoParaPdf)}
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

  // 2. ACCESO PÚBLICO (LOGIN)
  return (
    <div className="login-page">
      <div className="decoration decoration-top-left"></div>
      <div className="decoration decoration-bottom-right"></div>

      <div className="watermark">
        <img src={logoFisei} alt="" />
      </div>

      <section className="login-card">
        <div className="login-header">
          <img src={logoFisei} alt="Logo FISEI" className="login-logo" />
          <h2>FACULTAD DE INGENIERÍA EN SISTEMAS,</h2>
          <h2>ELECTRÓNICA E INDUSTRIAL</h2>

          <div className="separator">
            <span></span>
            <b>◆</b>
            <span></span>
          </div>

          <h1>{vista === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</h1>
          <p>{vista === 'login' ? 'Accede al sistema con tus credenciales' : 'Ingresa tus datos para registrarte'}</p>
        </div>

        {mensajeExito && (
          <div style={{ backgroundColor: '#e6ffed', color: '#155724', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
            {mensajeExito}
          </div>
        )}

        {error && <div className="login-error">{error}</div>}

        {vista === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="usuario">Correo electrónico</label>
              <div className="input-container">
                <span className="input-icon">♙</span>
                <input
                  id="usuario"
                  type="email"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="input-container">
                <span className="input-icon">♧</span>
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  required
                />
                <button
                  type="button"
                  className="password-button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                >
                  {mostrarPassword ? '◉' : '◌'}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={recordarme}
                  onChange={(e) => setRecordarme(e.target.checked)}
                />
                <span>Recordarme</span>
              </label>
              <button type="button" className="forgot-password">¿Olvidó su contraseña?</button>
            </div>

            <button type="submit" className="login-button" disabled={cargando}>
              <span>{cargando ? 'Ingresando...' : 'Ingresar'}</span>
              <span className="arrow">→</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="regNombre">Nombre completo</label>
              <div className="input-container">
                <span className="input-icon">👤</span>
                <input
                  id="regNombre"
                  type="text"
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  placeholder="Nombre y apellido"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="regEmail">Correo electrónico</label>
              <div className="input-container">
                <span className="input-icon">♙</span>
                <input
                  id="regEmail"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="regPassword">Contraseña</label>
              <div className="input-container">
                <span className="input-icon">♧</span>
                <input
                  id="regPassword"
                  type={mostrarRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-button" disabled={cargando}>
              <span>{cargando ? 'Registrando...' : 'Registrarse'}</span>
              <span className="arrow">→</span>
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

export default App