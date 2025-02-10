import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import { useNavigate } from 'react-router-dom';
import '../styles/historial.css'; // Importar el nuevo archivo de estilos

const Historial = () => {
  const [archivos, setArchivos] = useState([]);
  const [error, setError] = useState(null);
  const user = JSON.parse(localStorage.getItem('user')); // Obtener el objeto user
  const usuarioId = user ? user.id : null; // Obtener el ID del usuario
  const [username, setUsername] = useState('');
  const [userType, setUserType] = useState('');
  const navigate = useNavigate();
  const [isAscending, setIsAscending] = useState(true); // Estado para controlar el orden

  useEffect(() => {
    const fetchArchivos = async () => {
      if (!usuarioId) {
        setError('No se encontró el ID del usuario. Por favor, inicia sesión nuevamente.');
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/archivos/archivos/usuario/${usuarioId}`);
        setArchivos(response.data);
      } catch (err) {
        setError('Error al cargar los archivos.');
        console.error(err);
      }
    };

    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
          return;
        }

        const response = await axios.get('http://localhost:5000/auth/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.data.status === 200) {
          setUsername(response.data.nombre);
          setUserType(response.data.tipo);
        } else {
          setError('Error al cargar el perfil del usuario.');
        }
      } catch (err) {
        console.error('Error al cargar el perfil del usuario:', err);
        setError('Error al cargar el perfil del usuario.');
      }
    };

    fetchUserProfile();
    fetchArchivos();
  }, [usuarioId]);

  const handleDownload = async (id) => {
    try {
      const response = await axios.get(`http://localhost:5000/archivos/archivos/download/${id}`, {
        responseType: 'blob', // Para manejar archivos binarios
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `archivo_${id}.pdf`); // Cambia la extensión según el tipo de archivo
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Error al descargar el archivo.');
      console.error(err);
    }
  };

  const handleMenuItemClick = (menuItem) => {
    const routes = {
      'Home': '/home',
      'Recommendations': '/recommendations',
      'Users': '/user-management',
      'Settings': '/profile',
      'Historial': '/historial',
      'Dashboard': '/dashboard' // Asegúrate de que la ruta del Dashboard esté aquí
    };

    const route = routes[menuItem];
    if (route) {
      navigate(route);
    }
  };

  const sortByDate = () => {
    const sortedArchivos = [...archivos].sort((a, b) => {
      return isAscending 
        ? new Date(a.fecha_creacion) - new Date(b.fecha_creacion) 
        : new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
    });
    setArchivos(sortedArchivos);
    setIsAscending(!isAscending); // Cambiar el estado de orden
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        username={username} 
        userType={userType} 
        activeMenuItem="Historial"
        onMenuItemClick={handleMenuItemClick}
      />
      <div className="flex-1 p-4 overflow-y-auto historial-container">
        <h2 className="historial-title">Historial de Archivos</h2>
        {error && <p className="historial-error">{error}</p>}
        <button onClick={sortByDate} className="sort-button">
          Ordenar por Fecha {isAscending ? '↓' : '↑'}
        </button>
        <table className="historial-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Fecha de Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {archivos.map(archivo => (
              <tr key={archivo.id} className="historial-item">
                <td>{archivo.nombre}</td>
                <td>{new Date(archivo.fecha_creacion).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleDownload(archivo.id)} className="historial-button">
                    Descargar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Historial;