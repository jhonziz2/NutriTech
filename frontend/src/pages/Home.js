import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Chat from '../components/Chat';
import axios from 'axios';

// Configuración de axios con base URL y credenciales
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const Home = () => {
  const navigate = useNavigate();
  const [activeMenuItem, setActiveMenuItem] = useState('Home');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Estado de carga agregado

  const fetchUsername = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/user/profile');
      
      if (response.data.status === 200) {
        setUsername(response.data.nombre);
        setError('');
      } else {
        throw new Error(response.data.error || 'Error al obtener nombre de usuario');
      }
    } catch (error) {
      console.error('Error al obtener el nombre de usuario:', error);
      
      const errorHandlers = {
        401: () => {
          navigate('/');
          return 'No autorizado';
        },
        404: 'Perfil de usuario no encontrado',
        500: 'Error interno del servidor'
      };

      const handleError = (status) => {
        const handler = errorHandlers[status];
        return typeof handler === 'function' 
          ? handler() 
          : handler || 'Error desconocido';
      };

      const errorMessage = error.response 
        ? handleError(error.response.status)
        : 'No se pudo conectar con el servidor';

      setError(errorMessage);
    } finally {
      setLoading(false); // Finalizar carga
    }
  }, [navigate]);

  useEffect(() => {
    fetchUsername();
  }, [fetchUsername]);

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/api/logout');
      
      // Limpiar tokens o estado de autenticación
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');

      navigate("/");
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      
      const errorMessage = error.response?.data?.message 
        || 'No se pudo cerrar la sesión';
      
      setError(errorMessage);
    }
  };

  const handleMenuItemClick = (label) => {
    setActiveMenuItem(label);
    
    const routes = {
      'Home': '/home',
      'Recommendations': '/recommendations'
    };

    const route = routes[label];
    if (route) {
      navigate(route);
    } else {
      console.warn(`Ruta no definida para: ${label}`);
    }
  };

  const renderUserIcon = () => {
    const firstLetter = username ? username.charAt(0).toUpperCase() : 'U';
    return (
      <div className="w-12 h-12 bg-gray-300 flex items-center justify-center rounded-full">
        <span className="text-xl font-bold text-gray-700">{firstLetter}</span>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>; // Indicador de carga
  }

  return (
    <div className="flex h-screen">
      <aside className="w-72 bg-[#1c212c] flex flex-col items-center pt-5 pb-2 space-y-7">
        <div className="flex items-center space-x-4 mb-5">
          {renderUserIcon()}
          <div>
            <h2 className="text-white font-semibold">
              {username || 'Usuario'}
            </h2>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <p className="text-gray-400 text-sm">Admin</p>
          </div>
        </div>

        <div className="w-full pr-3 flex flex-col gap-y-1 text-gray-500 text-sm">
          <div className="font-QuicksandMedium pl-4 text-gray-400/60 text-xs uppercase">Menú</div>

          <MenuItem 
            label="Home" 
            isActive={activeMenuItem === 'Home'}
            onClick={() => handleMenuItemClick('Home')}
          >
            <HomeIcon />
          </MenuItem>

          <MenuItem 
            label="Recommendations" 
            isActive={activeMenuItem === 'Recommendations'}
            onClick={() => handleMenuItemClick('Recommendations')}
          >
            <RecommendationIcon />
          </MenuItem>

          <MenuItem 
            label="Salir" 
            onClick={handleLogout}
          >
            <LogoutIcon />
          </MenuItem>
        </div>
      </aside>

      <div className="flex-1 flex">
        <Chat className="flex-1" style={{ borderRadius: '0' }} />
      </div>
    </div>
  );
};

// Componente de MenuItem
const MenuItem = ({ label, children, isActive, onClick }) => {
  return (
    <div 
      className="w-full flex items-center gap-x-1.5 group select-none cursor-pointer" 
      onClick={onClick}
    >
      <div
        className={`w-1 h-8 bg-transparent transition-colors duration-200 relative overflow-hidden ${isActive ? "bg-green-600" : ""}`}
      >
        <div className="absolute top-0 left-0 w-full h-full translate-y-full group-hover:translate-y-0 bg-green-600 transition-all duration-300"></div>
      </div>
      <div className="group-hover:bg-white/10 w-full group-active:scale-95 self-stretch pl-2 flex items-center space-x-2 transition-all duration-200 dark:group-hover:text-white text-sm">
        <div className="group-hover:text-green-600">{children}</div>
        <span className="font-QuicksandMedium">{label}</span>
      </div>
    </div>
  );
};

// Iconos SVG
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);

const RecommendationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
    <path d="M7 12h4v2H7zm6 0h4v2h-4z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24">
    <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
  </svg>
);

export default Home;
