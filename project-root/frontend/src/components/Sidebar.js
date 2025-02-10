import React from 'react';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ 
  username, 
  userType, 
  error, 
  activeMenuItem, 
  onMenuItemClick, 
  onLogout 
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const isAdmin = userType?.toLowerCase() === 'admin';
  const isRegularUser = userType?.toLowerCase() === 'usuario';

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const renderUserIcon = () => {
    const firstLetter = username ? username.charAt(0).toUpperCase() : 'U';
    return (
      <div className="w-12 h-12 bg-gray-300 flex items-center justify-center rounded-full">
        <span className="text-xl font-bold text-gray-700">{firstLetter}</span>
      </div>
    );
  };

  const handleMenuItemClick = (menuItem) => {
    const routes = {
      'Home': '/home',
      'Recommendations': '/recommendations',
      'Dashboard': '/dashboard',
      'Users': '/user-management',
      'Settings': '/profile',
      'Historial': '/historial'
    };

    if (routes[menuItem]) {
      navigate(routes[menuItem]);
    }
    onMenuItemClick(menuItem);
  };

  const handleLogout = async () => {
    try {
      localStorage.clear();
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      navigate('/');
    }
  };

  return (
    <>
      {/* Botón hamburguesa para móvil */}
      <button 
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-[#1c212c] text-white"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay para cerrar el menú en móvil */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`
        fixed lg:static
        w-72 bg-[#1c212c] 
        flex flex-col items-center 
        pt-5 pb-2 space-y-7
        h-full
        z-50
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center space-x-4 mb-5">
          {renderUserIcon()}
          <div>
            <h2 className="text-white font-semibold">
              {username || 'Usuario'}
            </h2>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <p className="text-gray-400 text-sm">{isAdmin ? 'Administrador' : 'Usuario'}</p>
          </div>
        </div>

        <div className="w-full pr-3 flex flex-col gap-y-1 text-gray-500 text-sm">
          <div className="font-QuicksandMedium pl-4 text-[#FFFFFFBF] text-xs uppercase">
            Menú
          </div>

          <MenuItem 
            label="Inicio" 
            isActive={activeMenuItem === 'Home'}
            onClick={() => handleMenuItemClick('Home')}
          >
            <HomeIcon />
          </MenuItem>

          <MenuItem 
            label="Dashboard" 
            isActive={activeMenuItem === 'Dashboard'}
            onClick={() => handleMenuItemClick('Dashboard')}
          >
            <DashboardIcon />
          </MenuItem>

          {isAdmin && (
            <MenuItem 
              label="Users" 
              isActive={activeMenuItem === 'Users'}
              onClick={() => handleMenuItemClick('Users')}
            >
              <UsersIcon />
            </MenuItem>
          )}

          {isRegularUser && (
            <MenuItem 
              label="Configuración" 
              isActive={activeMenuItem === 'Settings'}
              onClick={() => handleMenuItemClick('Settings')}
            >
              <SettingsIcon />
            </MenuItem>
          )}

          <MenuItem 
            label="Historial" 
            isActive={activeMenuItem === 'Historial'}
            onClick={() => handleMenuItemClick('Historial')}
          >
            <HistoryIcon />
          </MenuItem>

          <MenuItem 
            label="Salir" 
            onClick={handleLogout}
          >
            <LogoutIcon />
          </MenuItem>
        </div>
      </aside>
    </>
  );
};

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
      <div className="group-hover:bg-white/10 w-full group-active:scale-95 self-stretch pl-2 flex items-center space-x-2 transition-all duration-200 text-[#FFFFFFBF] text-sm">
        <div className="group-hover:text-green-600">{children}</div>
        <span className="font-QuicksandMedium">{label}</span>
      </div>
    </div>
  );
};

// Icons components
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current text-[#FFFFFFBF] group-hover:text-green-600 transition-colors duration-200" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current text-[#FFFFFFBF] group-hover:text-green-600 transition-colors duration-200" viewBox="0 0 24 24">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current text-[#FFFFFFBF] group-hover:text-green-600 transition-colors duration-200" viewBox="0 0 24 24">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6s-1.62 3.6-3.6 3.6z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current text-[#FFFFFFBF] group-hover:text-green-600 transition-colors duration-200" viewBox="0 0 24 24">
    <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
  </svg>
);

const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current text-[#FFFFFFBF] group-hover:text-green-600 transition-colors duration-200" viewBox="0 0 24 24">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current text-[#FFFFFFBF] group-hover:text-green-600 transition-colors duration-200" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6h6v-2h-4z"/>
  </svg>
);

export default Sidebar;
