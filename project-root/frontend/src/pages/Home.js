// C:\Users\Jhon\Documents\8vo\Aplicaciones\proyecto\programa\project-root\frontend\src\pages\Home.js

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Chat from '../components/Chat';
import axios from 'axios';
import Sidebar from '../components/Sidebar'; // Ruta actualizada al componente Sidebar

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para agregar el token a todas las peticiones
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Error en la respuesta:', error);
    if (error.response?.status === 401 || error.response?.status === 422) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

const Home = () => {
  const navigate = useNavigate();
  const [activeMenuItem, setActiveMenuItem] = useState('Home');
  const [username, setUsername] = useState('');
  const [userType, setUserType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsername = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await axiosInstance.get('/auth/api/user/profile');
      console.log('Respuesta del servidor:', response.data); // Para debugging
      
      if (response.data.status === 200) {
        setUsername(response.data.nombre);
        const tipo = response.data.tipo.toLowerCase() === 'admin' ? 'admin' : 'usuario';
        setUserType(tipo);
        setError('');
      } else {
        throw new Error(response.data.message || 'Error al obtener datos del usuario');
      }
    } catch (error) {
      console.error('Error completo:', error);
      console.error('Respuesta del servidor:', error.response?.data);
      
      if (error.response?.status === 401 || error.response?.status === 422) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
      } else {
        setError(
          error.response?.data?.message || 
          error.message || 
          'Error al cargar el perfil del usuario'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUsername();
  }, [fetchUsername]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      navigate('/');
    }
  };

  const handleMenuItemClick = (label) => {
    setActiveMenuItem(label);
    
    const routes = {
      'Home': '/home',
      'Recommendations': '/recommendations',
      'Users': '/user-management',
      'Settings': '/profile'
    };

    const route = routes[label];
    if (route) {
      navigate(route);
    } else {
      console.warn(`Ruta no definida para: ${label}`);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar 
        username={username}
        userType={userType}
        error={error}
        activeMenuItem={activeMenuItem}
        onMenuItemClick={handleMenuItemClick}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex">
        <Chat className="flex-1" style={{ borderRadius: '0' }} />
      </div>
    </div>
  );
};

export default Home;