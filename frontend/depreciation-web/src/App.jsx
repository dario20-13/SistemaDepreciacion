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

      {/* PANEL IZQUIERDO */}
      <section className="brand-panel">

        <div className="brand-header">
        
          <img
            src={logoFisei}
            alt="Logo de la Facultad"
            className="logo-fisei"
          />
        </div>

        <div className="brand-content">

  <div className="faculty-title">
    <h2>FACULTAD DE INGENIERÍA EN</h2>
    <h1>SISTEMAS, ELECTRÓNICA</h1>
    <h1>E INDUSTRIAL</h1>
  </div>

  <div className="faculty-separator">
    <span></span>
    <b>◆</b>
    <span></span>
  </div>

  <h2 className="system-title">
    Sistema de Gestión de
    <br />
    Depreciación de Activos
  </h2>

  <p className="system-description">
    Controla, registra y calcula la depreciación
    <br />
    de los activos de tu organización.
  </p>

  </div>
      </section>


      {/* PANEL DERECHO */}
      <section className="login-panel">

        <div className="login-card">

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
              <b>•</b>
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
                  placeholder="Ingrese su usuario"
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
                  onClick={() => setMostrarPassword(!mostrarPassword)}
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
                  onChange={(e) => setRecordarme(e.target.checked)}
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
              <span>INGRESAR</span>
              <span className="arrow">→</span>
            </button>

          </form>

        </div>


        {/* FOOTER */}
        <footer className="login-footer">

          <p>
            © 2026 Facultad de Ingeniería en Sistemas,
            Electrónica e Industrial
          </p>

        </footer>

      </section>

    </div>
  )
}

export default App