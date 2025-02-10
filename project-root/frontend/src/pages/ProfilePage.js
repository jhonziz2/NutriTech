import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ProfileEditor from '../components/ProfileEditor';
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const ProfilePage = () => {
  const navigate = useNavigate();
  const [activeMenuItem, setActiveMenuItem] = useState('Settings');
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

      const response = await axiosInstance.get('/auth/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.status === 200) {
        setUsername(response.data.nombre);
        const tipo = response.data.tipo.toLowerCase() === 'admin' ? 'admin' : 'usuario';
        setUserType(tipo);
        setError('');
      } else {
        throw new Error(response.data.message || 'Error al obtener datos del usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
      setError('Error al cargar el perfil: ' + 
        (error.response?.data?.message || error.message));
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

  const handleMenuItemClick = (menuItem) => {
    setActiveMenuItem(menuItem);
    switch (menuItem) {
      case 'Home':
        navigate('/home');
        break;
      case 'Recommendations':
        navigate('/recommendations');
        break;
      case 'Users':
        navigate('/user-management');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
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
        <ProfileEditor />
      </div>
    </div>
  );
};

export default ProfilePage; 