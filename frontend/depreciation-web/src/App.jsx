import { useState } from 'react'
import './App.css'
import logoFisei from './assets/logo_Fisei.png'

function App() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [recordarme, setRecordarme] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()

    console.log('Usuario:', usuario)
    console.log('Recordarme:', recordarme)
  }

  return (
    <div className="login-page">

      {/* DECORACIÓN SUPERIOR IZQUIERDA */}
      <div className="decoration decoration-top-left"></div>

      {/* DECORACIÓN INFERIOR DERECHA */}
      <div className="decoration decoration-bottom-right"></div>

      {/* MARCA DE AGUA */}
      <div className="watermark">
        <img src={logoFisei} alt="" />
      </div>

      {/* TARJETA DE LOGIN */}
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

          <h1>Iniciar Sesión</h1>

          <p>
            Accede al sistema con tus credenciales
          </p>

        </div>

        <form onSubmit={handleLogin}>

          {/* USUARIO */}
          <div className="form-group">

            <label htmlFor="usuario">
              Usuario
            </label>

            <div className="input-container">

              <span className="input-icon">
                ♙
              </span>

              <input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="usuario@ejemplo.com"
                required
              />

            </div>

          </div>

          {/* CONTRASEÑA */}
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
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                required
              />

              <button
                type="button"
                className="password-button"
                onClick={() =>
                  setMostrarPassword(!mostrarPassword)
                }
                aria-label="Mostrar contraseña"
              >
                {mostrarPassword ? '◉' : '◌'}
              </button>

            </div>

          </div>

          {/* OPCIONES */}
          <div className="login-options">

            <label className="remember">

              <input
                type="checkbox"
                checked={recordarme}
                onChange={(e) =>
                  setRecordarme(e.target.checked)
                }
              />

              <span>Recordarme</span>

            </label>

            <button
              type="button"
              className="forgot-password"
            >
              ¿Olvidó su contraseña?
            </button>

          </div>

          {/* BOTÓN */}
          <button
            type="submit"
            className="login-button"
          >
            <span>Ingresar</span>
            <span className="arrow">→</span>
          </button>

        </form>

      </section>

    </div>
  )
}

export default App