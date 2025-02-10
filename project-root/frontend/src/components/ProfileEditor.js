import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/ProfileEditor.css';

const ProfileEditor = () => {
  const [userData, setUserData] = useState({
    nombre: '',
    email: '',
    password: '',
    currentPassword: '',
    tipo: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passwordTips, setPasswordTips] = useState([]);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No hay token de autenticación');
        return;
      }

      const response = await axios.get('http://localhost:5000/auth/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 200) {
        setUserData(prevState => ({
          ...prevState,
          nombre: response.data.nombre,
          email: response.data.email,
          tipo: response.data.tipo
        }));
        setError(null);
      } else {
        throw new Error(response.data.message || 'Error al cargar los datos del usuario');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setError('Sesión expirada. Por favor, vuelva a iniciar sesión.');
        // Opcional: Redirigir al login
        // navigate('/');
      } else {
        setError('Error al cargar los datos del usuario: ' + 
          (error.response?.data?.message || error.message));
      }
      console.error('Error:', error);
    }
  };

  const validatePassword = (password) => {
    const tips = [];
    if (password && password.length > 0) {
      if (password.length < 6) {
        tips.push('La contraseña debe tener al menos 6 caracteres');
      }
      if (!/[A-Za-z]/.test(password)) {
        tips.push('Debe incluir al menos una letra');
      }
      if (!/\d.*\d/.test(password)) {
        tips.push('Debe incluir al menos dos números');
      }
      if (!/[@$!%*?&]/.test(password)) {
        tips.push('Debe incluir al menos un carácter especial (@$!%*?&)');
      }
    }
    setPasswordTips(tips);
    return tips.length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'password') {
      validatePassword(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Validar contraseña si se está cambiando
      if (userData.password && !validatePassword(userData.password)) {
        setError('La contraseña no cumple con los requisitos');
        setLoading(false);
        return;
      }

      const updateData = {
        nombre: userData.nombre,
        currentPassword: userData.currentPassword
      };

      if (userData.password) {
        updateData.newPassword = userData.password;
      }

      const response = await axios.put(
        'http://localhost:5000/auth/api/user/profile',
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        setSuccess('Perfil actualizado exitosamente');
        setUserData(prev => ({
          ...prev,
          password: '',
          currentPassword: ''
        }));
        setPasswordTips([]);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al actualizar el perfil');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-editor-container">
      <h2 className="profile-editor-title">Editar Perfil</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label>Nombre:</label>
          <input
            type="text"
            name="nombre"
            value={userData.nombre}
            onChange={handleInputChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={userData.email}
            disabled
            className="disabled-input"
          />
          <small>El email no se puede modificar</small>
        </div>

        <div className="form-group">
          <label>Contraseña Actual:</label>
          <div className="password-input-container">
            <input
              type={showCurrentPassword ? "text" : "password"}
              name="currentPassword"
              value={userData.currentPassword}
              onChange={handleInputChange}
              required
              disabled={loading}
              className="password-input"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="password-toggle-button"
              disabled={loading}
            >
              {showCurrentPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Nueva Contraseña (opcional):</label>
          <div className="password-input-container">
            <input
              type={showNewPassword ? "text" : "password"}
              name="password"
              value={userData.password}
              onChange={handleInputChange}
              disabled={loading}
              className="password-input"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="password-toggle-button"
              disabled={loading}
            >
              {showNewPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              )}
            </button>
          </div>
          {passwordTips.length > 0 && (
            <ul className="password-tips">
              {passwordTips.map((tip, index) => (
                <li key={index} className="text-red-500">
                  <span className="mr-2">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar Perfil'}
        </button>
      </form>
    </div>
  );
};

export default ProfileEditor; 