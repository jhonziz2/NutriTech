import React from 'react';
import Sidebar from './Sidebar';
import { useNavigate } from 'react-router-dom';

const Layout = ({ children }) => {
  const [activeMenuItem, setActiveMenuItem] = React.useState('Dashboard');
  const navigate = useNavigate();
  
  // Obtener el usuario del localStorage y parsearlo correctamente
  const user = JSON.parse(localStorage.getItem('user')) || {};
  
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

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        username={user.username}
        userType={user.type} // Asegúrate de que coincida con la propiedad correcta del usuario
        activeMenuItem={activeMenuItem}
        onMenuItemClick={setActiveMenuItem}
        onLogout={handleLogout}
        error={null}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout; 