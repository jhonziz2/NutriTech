import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import SearchBar from './SearchBar';
import UserTable from './UserTable';
import DeleteModal from './DeleteModal';
import UserForm from './UserForm';
import TokenConfigModal from './TokenConfigModal';
import SuccessModal from './SuccessModal';
import '../../styles/UserManagementPage.css';

const UserManagement = () => {
  // Estados
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('nombre');
  const [newUser, setNewUser] = useState({ nombre: '', email: '', password: '', tipo: '' });
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordTips, setPasswordTips] = useState([]);
  const [emailError, setEmailError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [tokenHoras, setTokenHoras] = useState(1);
  const [mostrarModalToken, setMostrarModalToken] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Funciones de validación
  const validateHours = (value) => {
    if (isNaN(value)) {
      return 'El valor debe ser un número.';
    }
    if (value < 1 || value > 72) {
      return 'Debe estar entre 1 y 72 horas.';
    }
    return '';
  };

  // Función para actualizar el token
  const actualizarExpiracionToken = async () => {
    const error = validateHours(tokenHoras);
    if (error) {
      setTokenError(error);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const horasNum = parseInt(tokenHoras, 10);
      
      const response = await axios.post(
        'http://localhost:5000/auth/actualizar-horas-token', 
        { horas: horasNum },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 200) {
        setMostrarModalToken(false);
        setTokenError('');
        setSuccessMessage('Duración del token actualizada exitosamente');
      } else {
        throw new Error(response.data.message || 'Error al actualizar el token');
      }
    } catch (error) {
      console.error('Error al actualizar token:', error);
      setTokenError(
        error.response?.data?.message || 
        'Error al actualizar la duración del token'
      );
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar el ordenamiento
  const handleSort = useCallback(() => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    
    const sortedUsers = [...filteredUsers].sort((a, b) => {
      return newDirection === 'asc' ? a.id - b.id : b.id - a.id;
    });
    
    setFilteredUsers(sortedUsers);
  }, [filteredUsers, sortDirection]);

  // Función para manejar la búsqueda
  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      const allUsers = [...users].sort((a, b) => {
        return sortDirection === 'asc' ? a.id - b.id : b.id - a.id;
      });
      setFilteredUsers(allUsers);
      return;
    }

    const filtered = users.filter(user => {
      if (searchType === 'id') {
        return user.id.toString() === searchTerm.trim();
      } else {
        return user.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim());
      }
    });

    // Mantener el orden actual después de filtrar
    const sortedFiltered = filtered.sort((a, b) => {
      return sortDirection === 'asc' ? a.id - b.id : b.id - a.id;
    });

    setFilteredUsers(sortedFiltered);
  }, [searchTerm, searchType, users, sortDirection]);

  // Función para crear nuevo usuario
  const handleNewUserClick = () => {
    setEditUser(null);
    setNewUser({
      nombre: '',
      email: '',
      password: '',
      tipo: ''
    });
    setIsModalOpen(true);
  };

  // Función para editar usuario
  const handleEditClick = (user) => {
    setEditUser({
      ...user,
      password: ''
    });
    setNewUser({
      ...user,
      password: ''
    });
    setPasswordTips([]);
    setEmailError('');
    setIsModalOpen(true);
  };

  // Función para confirmar eliminación
  const confirmDeleteUser = (userId) => {
    setUserToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  // Función para eliminar usuario
  const deleteUser = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `http://localhost:5000/auth/api/users/${userToDelete}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Cerrar modal y limpiar estados
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setError('');
      
      // Actualizar la tabla inmediatamente
      try {
        const response = await axios.get('http://localhost:5000/auth/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.status === 200 && Array.isArray(response.data.data)) {
          setUsers(response.data.data);
          setFilteredUsers(response.data.data);
        }
      } catch (error) {
        console.error('Error al actualizar la tabla:', error);
      }

      setSuccessMessage('Usuario eliminado exitosamente');
      
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setError(
        error.response?.data?.message || 
        'Error al eliminar el usuario'
      );
    } finally {
      setLoading(false);
    }
  };

  // Función para enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const userData = editUser ? editUser : newUser;

      // Validaciones
      if (emailError) {
        setError('Por favor, corrija los errores en el formulario');
        return;
      }

      if (!editUser && passwordTips.length > 0) {
        setError('La contraseña no cumple con los requisitos');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (editUser) {
        // Actualizar usuario existente
        const updateData = {
          nombre: userData.nombre,
          email: userData.email,
          tipo: userData.tipo
        };

        if (userData.password) {
          updateData.password = userData.password;
        }

        await axios.put(
          `http://localhost:5000/auth/api/users/${userData.id}`,
          updateData,
          { headers }
        );
      } else {
        try {
          await axios.post(
            'http://localhost:5000/auth/api/users',
            userData,
            { headers }
          );

          // Limpiar formulario y cerrar modal
          setIsModalOpen(false);
          setEditUser(null);
          setNewUser({
            nombre: '',
            email: '',
            password: '',
            tipo: ''
          });
          setPasswordTips([]);
          setEmailError('');
          setError('');
          
          // Actualizar tabla y mostrar mensaje de éxito
          await fetchUsers();
          setSuccessMessage('Usuario creado exitosamente');
        } catch (error) {
          if (error.response?.data?.message?.includes('correo electrónico ya está registrado')) {
            setEmailError('El correo electrónico ya está registrado');
          } else {
            throw error; // Re-lanzar otros errores
          }
        }
      }
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      setError(
        error.response?.data?.message || 
        'Error al guardar el usuario. Por favor, intente nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  // También necesitamos agregar la validación de contraseña
  const validatePassword = (value) => {
    if (editUser && !value) return [];

    const tips = [];
    if (value.length < 6) {
      tips.push('Debe tener al menos 6 caracteres.');
    }
    if (!/[A-Za-z]/.test(value)) {
      tips.push('Debe incluir al menos una letra.');
    }
    if (!/\d.*\d/.test(value)) {
      tips.push('Debe incluir al menos dos números.');
    }
    if (!/[@$!%*?&]/.test(value)) {
      tips.push('Debe incluir al menos un carácter especial (@$!%*?&).');
    }
    return tips;
  };

  // Y actualizar el handleInputChange para incluir las validaciones
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Actualizar el estado correcto según si estamos editando o creando
    if (editUser) {
      setEditUser(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setNewUser(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Validaciones
    if (name === 'password') {
      const tips = validatePassword(value);
      setPasswordTips(tips);
    }
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setEmailError('El formato del correo electrónico no es válido');
      } else {
        setEmailError('');
      }
    }
  };

  // Efectos
  useEffect(() => {
    if (!loading) {
      handleSearch();
    }
  }, [searchTerm, searchType, users, handleSearch, loading]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/auth/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.status === 200 && Array.isArray(response.data.data)) {
        const sortedUsers = response.data.data.sort((a, b) => {
          return sortDirection === 'asc' ? a.id - b.id : b.id - a.id;
        });
        setUsers(sortedUsers);
        setFilteredUsers(sortedUsers);
        setError(null);
      }
    } catch (error) {
      setError('Error al cargar usuarios: ' + 
        (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [sortDirection]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Renderizado
  return (
    <div className="user-management-container">
      <div className="header">
        <h2 className="text-lg font-semibold">Gestión de Usuarios</h2>
      </div>

      <SearchBar 
        searchType={searchType}
        setSearchType={setSearchType}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        loading={loading}
      />

      {error && <div className="error-message">{error}</div>}
      {loading && <div className="loading-message">Cargando...</div>}

      <UserTable 
        filteredUsers={filteredUsers}
        handleEditClick={handleEditClick}
        confirmDeleteUser={confirmDeleteUser}
        loading={loading}
        handleSort={handleSort}
        sortDirection={sortDirection}
      />

      <div className="action-buttons">
        <button 
          onClick={handleNewUserClick} 
          className="new-user-button"
          disabled={loading}
        >
          Nuevo Usuario
        </button>

        <button 
          onClick={() => setMostrarModalToken(true)}
          className="boton-config-token"
          disabled={loading}
        >
          Configurar Tiempo Token
        </button>
      </div>

      <DeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteUser}
        loading={loading}
      />

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
            <UserForm 
              user={editUser || newUser}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsModalOpen(false);
                setEditUser(null);
                setNewUser({
                  nombre: '',
                  email: '',
                  password: '',
                  tipo: ''
                });
                setPasswordTips([]);
                setEmailError('');
              }}
              passwordTips={passwordTips}
              emailError={emailError}
              loading={loading}
              isEditing={!!editUser}
            />
          </div>
        </div>
      )}

      <TokenConfigModal 
        isOpen={mostrarModalToken}
        onClose={() => setMostrarModalToken(false)}
        tokenHoras={tokenHoras}
        onTokenHorasChange={(e) => setTokenHoras(e.target.value)}
        onSubmit={actualizarExpiracionToken}
        tokenError={tokenError}
        loading={loading}
      />

      <SuccessModal 
        isOpen={!!successMessage}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
      />
    </div>
  );
};

export default UserManagement; 