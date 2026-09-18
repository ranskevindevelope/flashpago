import React, { useState, Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import FlashPagoLanding from './Flashpagolanding';
import Login from './Login';
import RecuperarPassword from './RecuperarPassword';
import Dashboard from './Dashboard';
import Terminos from './Terminos';
import Privacidad from './Privacidad';
import DocumentoInterno from './DocumentoInterno';
import './App.css';

// Lazy: Registro es el único que usa `motion` (~40KB), y casi nadie vuelve
// a esta pantalla tras crear su cuenta.
const Registro = lazy(() => import('./Registro'));

const queryClient = new QueryClient();

function App() {
  const paramsUrl = new URLSearchParams(window.location.search);

  // flashpago.co y app.flashpago.co son orígenes distintos sin localStorage
  // compartido, así que el token de auto-login llega por la URL.
  const tokenDeUrl = paramsUrl.get('token');
  const userDeUrl = paramsUrl.get('user');
  if (tokenDeUrl && userDeUrl) {
    localStorage.setItem('fp_token', tokenDeUrl);
    localStorage.setItem('fp_user', userDeUrl);
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('user');
    window.history.replaceState({}, '', url.toString());
  }

  // /panel queda como respaldo (bookmarks viejos, o si comparten dominio de nuevo).
  const esPanel = window.location.hostname.startsWith('app.') || window.location.pathname.startsWith('/panel');
  const vistaSolicitada = paramsUrl.get('vista');
  const [vista, setVista] = useState(
    ['terminos', 'privacidad', 'interno'].includes(vistaSolicitada)
      ? vistaSolicitada
      : esPanel
        ? (localStorage.getItem('fp_token') ? 'dashboard' : 'login')
        : 'landing'
  );
  // Si Google Login trae un correo nuevo, el backend manda un token de
  // registro pendiente para que Registro arranque con el correo ya confirmado.
  const [datosGoogle, setDatosGoogle] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('fp_token');
    localStorage.removeItem('fp_user');
    // La cookie de sesión es httpOnly: solo el servidor puede borrarla. Si
    // falla (sin red), igual se cierra la sesión en el cliente; la cookie
    // caduca sola a las 24h.
    fetch('/api/logout', { method: 'POST' }).catch(() => {});
    // Limpiar la URL: al cerrar sesión no debe quedar el ?seccion= de la vista
    // anterior colgado en la barra de direcciones.
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setVista('login');
  };

  let pantalla;
  if (vista === 'landing') {
    pantalla = <FlashPagoLanding onLogin={() => setVista('login')} onRegistro={() => setVista('registro')} onTerminos={() => setVista('terminos')} onPrivacidad={() => setVista('privacidad')} />;
  } else if (vista === 'terminos') {
    pantalla = <Terminos onVolver={() => setVista('landing')} />;
  } else if (vista === 'privacidad') {
    pantalla = <Privacidad onVolver={() => setVista('landing')} />;
  } else if (vista === 'interno') {
    pantalla = <DocumentoInterno onVolver={() => setVista('landing')} />;
  } else if (vista === 'registro') {
    pantalla = <Registro onBack={() => { setDatosGoogle(null); setVista('login'); }} datosGoogle={datosGoogle} />;
  } else if (vista === 'login') {
    pantalla = <Login onLogin={() => setVista('dashboard')} onRegistro={(datos) => { setDatosGoogle(datos || null); setVista('registro'); }} onRecuperar={() => setVista('recuperar')} />;
  } else if (vista === 'recuperar') {
    pantalla = <RecuperarPassword onVolver={() => setVista('login')} />;
  } else {
    pantalla = <Dashboard onLogout={handleLogout} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        {pantalla}
      </Suspense>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    </QueryClientProvider>
  );
}

export default App;