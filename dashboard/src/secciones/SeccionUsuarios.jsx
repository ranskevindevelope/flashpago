import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, UserCheck, UserX, Shield, CreditCard, Edit, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { FilaSkeleton, TarjetaSkeleton } from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import ModalConfirmacion from '../components/ModalConfirmacion';
import { useUsuarios } from '../hooks/useUsuarios';
import { PASSWORD_VALIDA, PASSWORD_ERROR } from '../utils/password';

const FORM_VACIO = { usuario: '', password: '', nombre: '', rol: 'empleado', whatsapp: '', email: '' };

export default function SeccionUsuarios({ api }) {
  const queryClient = useQueryClient();
  const { data: usuarios = [], isLoading: cargandoUsuarios } = useUsuarios(api);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['usuarios'] });

  const cancelarForm = () => {
    setMostrarForm(false);
    setEditando(null);
    setForm(FORM_VACIO);
  };

  const crearUsuario = async () => {
    if (!form.usuario || !form.password || !form.nombre) {
      toast.error('Usuario, contraseña y nombre son requeridos');
      return;
    }
    if (!PASSWORD_VALIDA.test(form.password)) {
      toast.error(PASSWORD_ERROR);
      return;
    }

    setGuardando(true);
    try {
      const data = await api.request('/api/usuarios', { method: 'POST', body: JSON.stringify(form) });
      if (data.ok) {
        toast.success(`Usuario "${form.usuario}" creado exitosamente`);
        cancelarForm();
        refrescar();
      } else {
        toast.error(data.error || 'Error creando usuario');
      }
    } catch (err) {
      toast.error(err.message || 'Error de conexión');
    }
    setGuardando(false);
  };

  const actualizarUsuario = async () => {
    if (form.password && !PASSWORD_VALIDA.test(form.password)) {
      toast.error(PASSWORD_ERROR);
      return;
    }
    setGuardando(true);
    try {
      const body = { nombre: form.nombre, rol: form.rol, whatsapp: form.whatsapp, email: form.email };
      if (form.password) body.password = form.password;

      const data = await api.request(`/api/usuarios/${editando}`, { method: 'PUT', body: JSON.stringify(body) });
      if (data.ok) {
        toast.success('Usuario actualizado');
        cancelarForm();
        refrescar();
      } else {
        toast.error(data.error || 'Error actualizando');
      }
    } catch (err) {
      toast.error(err.message || 'Error de conexión');
    }
    setGuardando(false);
  };

  const desactivarUsuario = (id, nombre) => {
    setConfirmacion({
      titulo: `¿Desactivar al usuario "${nombre}"?`,
      textoConfirmar: 'Desactivar',
      peligro: true,
      accion: async () => {
        try {
          const data = await api.request(`/api/usuarios/${id}`, { method: 'DELETE' });
          if (data.ok) {
            toast.success(`Usuario "${nombre}" desactivado`);
            refrescar();
          } else {
            toast.error(data.error);
          }
        } catch (err) {
          toast.error(err.message || 'Error de conexión');
        }
      },
    });
  };

  const ejecutarConfirmacion = async () => {
    if (!confirmacion) return;
    setConfirmando(true);
    try {
      await confirmacion.accion();
    } finally {
      setConfirmando(false);
      setConfirmacion(null);
    }
  };

  const reactivarUsuario = async (id) => {
    try {
      const data = await api.request(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify({ activo: 1 }) });
      if (data.ok) {
        toast.success('Usuario reactivado');
        refrescar();
      }
    } catch (err) {
      toast.error(err.message || 'Error de conexión');
    }
  };

  const iniciarEdicion = (user) => {
    setEditando(user.id);
    setForm({ usuario: user.usuario, password: '', nombre: user.nombre, rol: user.rol, whatsapp: user.whatsapp || '', email: user.email || '' });
    setMostrarForm(true);
  };

  const columnas = ['Nombre', 'Usuario', 'Rol', 'WhatsApp', 'Estado', 'Último login', 'Acciones'];

  return (
    <>
      <div className="tarjetas-grid">
        {cargandoUsuarios ? (
          <>
            <TarjetaSkeleton />
            <TarjetaSkeleton />
            <TarjetaSkeleton />
            <TarjetaSkeleton />
          </>
        ) : (
          <>
            <div className="tarjeta tarjeta-accent">
              <div className="tarjeta-icon-box tarjeta-icon-naranja"><Users size={22} /></div>
              <div className="tarjeta-info">
                <span className="tarjeta-label">Total usuarios</span>
                <span className="tarjeta-valor">{usuarios.length}</span>
                <span className="tarjeta-sub">Registrados</span>
              </div>
            </div>
            <div className="tarjeta">
              <div className="tarjeta-icon-box tarjeta-icon-verde"><UserCheck size={22} /></div>
              <div className="tarjeta-info">
                <span className="tarjeta-label">Activos</span>
                <span className="tarjeta-valor">{usuarios.filter(u => u.activo).length}</span>
                <span className="tarjeta-sub">Con acceso al sistema</span>
              </div>
            </div>
            <div className="tarjeta">
              <div className="tarjeta-icon-box tarjeta-icon-azul"><Shield size={22} /></div>
              <div className="tarjeta-info">
                <span className="tarjeta-label">Administradores</span>
                <span className="tarjeta-valor">{usuarios.filter(u => u.rol === 'admin').length}</span>
                <span className="tarjeta-sub">Acceso total</span>
              </div>
            </div>
            <div className="tarjeta">
              <div className="tarjeta-icon-box tarjeta-icon-morado"><CreditCard size={22} /></div>
              <div className="tarjeta-info">
                <span className="tarjeta-label">Empleados</span>
                <span className="tarjeta-valor">{usuarios.filter(u => u.rol === 'empleado').length}</span>
                <span className="tarjeta-sub">Acceso limitado</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="seccion">
        <div className="seccion-header">
          <h2 className="seccion-titulo"><Users size={18} /> Usuarios del sistema</h2>
          {!mostrarForm && (
            <button className="exportar-btn" onClick={() => { setMostrarForm(true); setEditando(null); setForm(FORM_VACIO); }}>
              <UserPlus size={14} /> Nuevo usuario
            </button>
          )}
        </div>

        {mostrarForm && (
          <div className="usuario-form">
            <h3 className="usuario-form-titulo">
              {editando ? <><Edit size={16} /> Editar usuario</> : <><UserPlus size={16} /> Crear nuevo usuario</>}
            </h3>
            <div className="usuario-form-grid">
              <div className="usuario-form-campo">
                <label>Nombre completo</label>
                <input type="text" placeholder="Ej: Kevin Ramírez" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="usuario-form-campo">
                <label>Usuario (login)</label>
                <input type="text" placeholder="Ej: kevin" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} disabled={!!editando} />
              </div>
              <div className="usuario-form-campo">
                <label>{editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
                <input type="password" placeholder={editando ? '••••••' : 'Mín. 8, con Mayús. y minús.'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="usuario-form-campo">
                <label>Rol</label>
                <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                  <option value="empleado">Empleado</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="usuario-form-campo">
                <label>WhatsApp (opcional)</label>
                <input type="text" placeholder="Ej: 573001234567@c.us" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              <div className="usuario-form-campo">
                <label>Email (para recuperar contraseña)</label>
                <input type="email" placeholder="Ej: kevin@negocio.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="usuario-form-acciones">
              <Button onClick={editando ? actualizarUsuario : crearUsuario} loading={guardando} icon={<Save size={15} />}>
                {editando ? 'Guardar cambios' : 'Crear usuario'}
              </Button>
              <Button variant="secondary" onClick={cancelarForm} icon={<X size={15} />}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="tabla-container">
          <table className="tabla-pagos">
            <thead>
              <tr>{columnas.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {cargandoUsuarios ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <FilaSkeleton key={`skeleton-${i}`} columnas={['65%', '50%', 55, '50%', 55, '45%', 50]} />
                ))
              ) : (
                usuarios.map(user => (
                  <tr key={user.id} style={!user.activo ? { opacity: 0.5 } : {}}>
                    <td className="td-cliente">{user.nombre}</td>
                    <td>{user.usuario}</td>
                    <td>
                      <span className={`banco-badge ${user.rol === 'admin' ? 'badge-bancolombia' : 'badge-nequi'}`}>
                        {user.rol === 'admin' ? 'Admin' : 'Empleado'}
                      </span>
                    </td>
                    <td>{user.whatsapp || '—'}</td>
                    <td>
                      <span className={`fuente-badge ${user.activo ? 'fuente-gmail' : 'fuente-nocturna'}`}>
                        {user.activo ? <><UserCheck size={11} /> Activo</> : <><UserX size={11} /> Inactivo</>}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{user.ultimo_login || 'Nunca'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="ver-foto-btn" onClick={() => iniciarEdicion(user)} title="Editar">
                          <Edit size={13} />
                        </button>
                        {user.activo ? (
                          <button className="ver-foto-btn" onClick={() => desactivarUsuario(user.id, user.nombre)} title="Desactivar" style={{ color: '#E53935' }}>
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <button className="ver-foto-btn" onClick={() => reactivarUsuario(user.id)} title="Reactivar" style={{ color: '#43A047' }}>
                            <UserCheck size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalConfirmacion
        abierto={!!confirmacion}
        titulo={confirmacion?.titulo}
        descripcion={confirmacion?.descripcion}
        textoConfirmar={confirmacion?.textoConfirmar}
        peligro={confirmacion?.peligro}
        cargando={confirmando}
        onConfirmar={ejecutarConfirmacion}
        onCancelar={() => !confirmando && setConfirmacion(null)}
      />
    </>
  );
}
