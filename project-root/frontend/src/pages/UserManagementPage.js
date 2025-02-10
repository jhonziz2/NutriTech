import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import UserManagement from "../components/UserManagement";
import Sidebar from "../components/Sidebar";
import axios from 'axios';

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
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

const UserManagementPage = () => {
  const navigate = useNavigate();
  const [activeMenuItem, setActiveMenuItem] = useState('Users');
  const [username, setUsername] = useState('');
  const [userType, setUserType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await axiosInstance.get('/auth/api/user/profile');
      
      if (response.data.status === 200) {
        setUsername(response.data.nombre);
        const tipo = response.data.tipo;
        setUserType(tipo);

        // Verificar si el usuario es admin
        if (tipo.toLowerCase() !== 'admin') {
          navigate('/home');
          return;
        }

        setError('');
      } else {
        throw new Error(response.data.message || 'Error al obtener datos del usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 401) {
        navigate('/');
      } else {
        setError('Error al cargar el perfil: ' + 
          (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

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

  const handleMenuItemClick = (menuItem) => {
    setActiveMenuItem(menuItem);
    const routes = {
      'Home': '/home',
      'Recommendations': '/recommendations',
      'Users': '/user-management',
      'Settings': '/profile'
    };

    const route = routes[menuItem];
    if (route) {
      navigate(route);
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
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <UserManagement />
      </div>
    </div>
  );
};

export default UserManagementPage;
