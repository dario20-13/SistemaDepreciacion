import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import logoFisei from './assets/logo_Fisei.png'

function App() {
  // Estado para alternar entre login y registro: 'login' o 'registro'
  const [vista, setVista] = useState('login')

  // Campos de Login
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [recordarme, setRecordarme] = useState(false)

  // Campos de Registro
  const [regNombre, setRegNombre] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [mostrarRegPassword, setMostrarRegPassword] = useState(false)

  // Estados de control
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [cargando, setCargando] = useState(false)
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(null)

  // Cargar sesión si ya existía en LocalStorage
  useEffect(() => {
    const token = localStorage.getItem('token')
    const usuarioGuardado = localStorage.getItem('usuario')
    if (token && usuarioGuardado) {
      setUsuarioAutenticado(JSON.parse(usuarioGuardado))
    }
  }, [])

  // Petición de Login
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
      console.error(err)
      if (err.response) {
        setError(
          typeof err.response.data === 'string'
            ? err.response.data
            : 'Correo o contraseña incorrectos.'
        )
      } else {
        setError('No se pudo conectar con el servidor.')
      }
    } finally {
      setCargando(false)
    }
  }

  // Petición de Registro
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

      setMensajeExito('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.')
      setUsuario(regEmail)
      setPassword('')
      setRegNombre('')
      setRegEmail('')
      setRegPassword('')
      setVista('login')

    } catch (err) {
      console.error(err)
      if (err.response) {
        setError(
          typeof err.response.data === 'string'
            ? err.response.data
            : 'Error al registrar el usuario.'
        )
      } else {
        setError('No se pudo conectar con el servidor.')
      }
    } finally {
      setCargando(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuarioAutenticado(null)
    setUsuario('')
    setPassword('')
    setError('')
    setMensajeExito('')
  }

  // 1. PANTALLA PRINCIPAL (DASHBOARD)
  if (usuarioAutenticado) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #800000', paddingBottom: '15px' }}>
          <div>
            <h1 style={{ color: '#800000', margin: 0 }}>Sistema de Depreciación</h1>
            <p style={{ margin: '5px 0 0 0', color: '#555' }}>
              Bienvenido(a), <strong>{usuarioAutenticado.nombre}</strong> ({usuarioAutenticado.rol})
            </p>
          </div>
          <button 
            onClick={handleLogout}
            style={{ padding: '8px 16px', backgroundColor: '#800000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </header>

        <main style={{ marginTop: '30px' }}>
          <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 style={{ marginTop: 0 }}>Panel Principal</h3>
            <p>Has iniciado sesión con el correo: <code>{usuarioAutenticado.email}</code></p>
            <p>La sesión y el token de autorización JWT se encuentran activos.</p>
          </div>
        </main>
      </div>
    )
  }

  // 2. FORMULARIO DE ACCESO (LOGIN O REGISTRO)
  return (
    <div className="login-page">
      <div className="decoration decoration-top-left"></div>
      <div className="decoration decoration-bottom-right"></div>

      <div className="watermark">
        <img src={logoFisei} alt="" />
      </div>

      <section className="login-card">
        <div className="login-header">
          <img
            src={logoFisei}
            alt="Logo FISEI"
            className="login-logo"
          />
          <h2>FACULTAD DE INGENIERÍA EN SISTEMAS,</h2>
          <h2>ELECTRÓNICA E INDUSTRIAL</h2>

          <div className="separator">
            <span></span>
            <b>◆</b>
            <span></span>
          </div>

          <h1>{vista === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</h1>
          <p>
            {vista === 'login' 
              ? 'Accede al sistema con tus credenciales' 
              : 'Ingresa tus datos para registrarte'}
          </p>
        </div>

        {mensajeExito && (
          <div style={{ backgroundColor: '#e6ffed', color: '#155724', padding: '10px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #c3e6cb', fontSize: '14px' }}>
            {mensajeExito}
          </div>
        )}

        {error && <div className="login-error">{error}</div>}

        {vista === 'login' ? (
          /* FORMULARIO DE LOGIN */
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
                  aria-label="Mostrar contraseña"
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
              <button type="button" className="forgot-password">
                ¿Olvidó su contraseña?
              </button>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={cargando}
            >
              <span>{cargando ? 'Ingresando...' : 'Ingresar'}</span>
              <span className="arrow">→</span>
            </button>

            <div className="register-option">
              <span>¿No tienes una cuenta?</span>
              <button
                type="button"
                className="register-button"
                onClick={() => {
                  setError('')
                  setMensajeExito('')
                  setVista('registro')
                }}
              >
                Crear una cuenta
              </button>
            </div>
          </form>
        ) : (
          /* FORMULARIO DE REGISTRO */
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
                  placeholder="Tu nombre y apellido"
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
                <button
                  type="button"
                  className="password-button"
                  onClick={() => setMostrarRegPassword(!mostrarRegPassword)}
                  aria-label="Mostrar contraseña"
                >
                  {mostrarRegPassword ? '◉' : '◌'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={cargando}
            >
              <span>{cargando ? 'Registrando...' : 'Registrarse'}</span>
              <span className="arrow">→</span>
            </button>

            <div className="register-option">
              <span>¿Ya tienes una cuenta?</span>
              <button
                type="button"
                className="register-button"
                onClick={() => {
                  setError('')
                  setMensajeExito('')
                  setVista('login')
                }}
              >
                Iniciar Sesión
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

export default App