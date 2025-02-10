import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [token, setToken] = useState('');
  const [errors, setErrors] = useState({});
  const [passwordTips, setPasswordTips] = useState('');
  const [notification, setNotification] = useState('');
 
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (value) => {
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

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordTips(validatePassword(value).join(' '));
  };

  // Función para verificar email existente
  const checkEmailExists = async (email) => {
    try {
      const response = await axios.post('http://localhost:5000/auth/check-email', { email });
      return response.data.exists;
    } catch (error) {
      console.error('Error al verificar email:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setNotification('');
    
    try {
      setLoading(true);

      // Validaciones
      let currentErrors = {};
      if (!email.trim()) currentErrors.email = 'El email es requerido';
      if (!password.trim()) currentErrors.password = 'La contraseña es requerida';
      
      if (isRegistering) {
        // Validar nombre
        if (!nombre.trim()) {
          currentErrors.nombre = 'El nombre es requerido';
        }

        // Validar contraseñas
        if (password !== confirmPassword) {
          currentErrors.confirmPassword = 'Las contraseñas no coinciden';
        }

        const passwordValidation = validatePassword(password);
        if (passwordValidation.length > 0) {
          currentErrors.password = 'La contraseña no cumple con los requisitos';
          setPasswordTips(passwordValidation.join(' '));
        }

        // Verificar si el email ya existe
        if (email.trim() && !currentErrors.email) {
          const emailExists = await checkEmailExists(email);
          if (emailExists) {
            currentErrors.email = 'El correo electrónico ya está registrado';
          }
        }
      }

      if (Object.keys(currentErrors).length > 0) {
        setErrors(currentErrors);
        return;
      }

      if (isRegistering) {
        // Lógica de registro
        const response = await axios.post('http://localhost:5000/auth/register', {
          nombre: nombre.trim(),
          email: email.trim(),
          password: password.trim(),
          tipo: 'usuario' // Por defecto registramos como usuario normal
        });

        if (response.data.status === 201) {
          setNotification('Cuenta creada exitosamente. Por favor, inicia sesión.');
          setIsRegistering(false);
          // Limpiar campos
          setNombre('');
          setPassword('');
          setConfirmPassword('');
          setEmail('');
        }
      } else {
        // Lógica de login
        const response = await axios.post('http://localhost:5000/auth/login', {
          email: email.trim(),
          password: password.trim()
        });

        if (response.data.status === 200 && response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          navigate('/home');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      
      if (error.response?.data?.message === 'El correo electrónico ya está registrado') {
        setErrors({ email: 'El correo electrónico ya está registrado' });
      } else {
        setNotification(
          error.response?.data?.message || 
          'Error en el servidor. Por favor, intente nuevamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverPassword = async (e) => {
    e.preventDefault();
    setErrors({});
    setNotification('');
    
    try {
      setLoading(true);
      
      if (!email.trim()) {
        setErrors({ email: 'El email es requerido' });
        return;
      }

      const response = await axios.post('http://localhost:5000/auth/recover-password', {
        email: email.trim()
      });

      if (response.data.message) {
        setNotification('Se ha enviado un correo con las instrucciones para recuperar tu contraseña.');
        setHasToken(true); // Mostrar el campo para ingresar el token
      }
    } catch (error) {
      console.error('Error:', error);
      setNotification(
        error.response?.data?.message || 
        'Error al enviar el correo de recuperación.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrors({});
    setNotification('');

    try {
      setLoading(true);

      if (!token.trim()) {
        setErrors({ token: 'El token es requerido' });
        return;
      }

      if (!password.trim()) {
        setErrors({ password: 'La contraseña es requerida' });
        return;
      }

      const passwordValidation = validatePassword(password);
      if (passwordValidation.length > 0) {
        setErrors({ password: 'La contraseña no cumple con los requisitos' });
        setPasswordTips(passwordValidation.join(' '));
        return;
      }

      const response = await axios.post(`http://localhost:5000/auth/reset-password/${token}`, {
        password: password.trim()
      });

      if (response.data.message) {
        setNotification('Contraseña actualizada exitosamente. Por favor, inicia sesión.');
        setIsResetting(false);
        setHasToken(false);
        setToken('');
        setPassword('');
      }
    } catch (error) {
      console.error('Error:', error);
      setNotification(
        error.response?.data?.message || 
        'Error al restablecer la contraseña.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans">
      <div className="relative min-h-screen flex flex-col sm:justify-center items-center bg-gray-100">
        <div className="relative sm:max-w-sm w-full">
          <div className="card bg-blue-400 shadow-lg w-full h-full rounded-3xl absolute transform -rotate-6"></div>
          <div className="card bg-red-400 shadow-lg w-full h-full rounded-3xl absolute transform rotate-6"></div>
          <div className="relative w-full rounded-3xl px-6 py-4 bg-gray-100 shadow-md">
            <label className="block mt-3 text-sm text-gray-700 text-center font-semibold">
              {isRegistering ? 'Registro' : isResetting ? 'Recuperar Contraseña' : 'Login'}
            </label>

            {notification && (
              <div className="mt-4 text-sm text-center text-green-600">
                {notification}
              </div>
            )}

            {!isResetting && (
              <form className="mt-10" onSubmit={handleSubmit}>
                {isRegistering && (
                  <div>
                    <input
                      type="text"
                      placeholder="Nombre"
                      className="mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                    {errors.nombre && <p className="text-red-500 text-xs">{errors.nombre}</p>}
                  </div>
                )}
                {isResetting && hasToken && (
                  <div>
                    <input
                      type="text"
                      placeholder="Token"
                      className="mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                    {errors.token && <p className="text-red-500 text-xs">{errors.token}</p>}
                  </div>
                )}

                <div className="mt-7">
                  <input
                    type={isResetting && hasToken ? "password" : "email"}
                    placeholder={isResetting && hasToken ? "Nueva contraseña" : "Correo electrónico"}
                    className="mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0"
                    value={isResetting && hasToken ? password : email}
                    onChange={(e) => (isResetting && hasToken ? handlePasswordChange(e) : setEmail(e.target.value))}
                  />
                  {errors.email && !isResetting && <p className="text-red-500 text-xs">{errors.email}</p>}
                  {errors.password && isResetting && hasToken && <p className="text-red-500 text-xs">{errors.password}</p>}
                  {isResetting && hasToken && passwordTips && <p className="text-blue-500 text-xs mt-1">{passwordTips}</p>}
                </div>

                {!isResetting && (
                  <div className="mt-7">
                    <input
                      type="password"
                      placeholder="Contraseña"
                      className="mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0"
                      value={password}
                      onChange={handlePasswordChange}
                    />
                    {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
                    {isRegistering && passwordTips && <p className="text-blue-500 text-xs mt-1">{passwordTips}</p>}
                  </div>
                )}

                {(isRegistering || (isResetting && hasToken)) && (
                  <div className="mt-7">
                    <input
                      type="password"
                      placeholder="Confirmar contraseña"
                      className="mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs">{errors.confirmPassword}</p>
                    )}
                  </div>
                )}

                <div className="mt-7">
                  <button
                    type="submit"
                    className="bg-[#639CF8] w-full py-3 rounded-xl text-[#000000] shadow-xl hover:shadow-inner focus:outline-none transition duration-500 ease-in-out transform hover:-translate-x hover:scale-105"
                  >
                    {isResetting
                      ? hasToken
                        ? 'Restablecer contraseña'
                        : 'Enviar correo de recuperación'
                      : isRegistering
                      ? 'Crear cuenta'
                      : 'Login'}
                  </button>
                </div>
                <div className="mt-7 flex justify-center items-center">
                  {!isResetting && (
                    <>
                      <label className="mr-2">
                        {isRegistering ? '¿Ya tienes cuenta?' : '¿Eres nuevo?'}
                      </label>
                      <button
                        type="button"
                        className="text-[#0842A1]"
                        onClick={() => {
                          setIsRegistering(!isRegistering);
                          setConfirmPassword('');
                          setErrors({});
                          setNotification('');
                        }}
                      >
                        {isRegistering ? 'Inicia sesión' : 'Crea una cuenta'}
                      </button>
                    </>
                  )}
                </div>
                <div className="mt-4 flex justify-center items-center">
                  {(!isRegistering && !isResetting) || (isResetting && !hasToken) ? (
                    <button
                      type="button"
                      className="text-[#0842A1]"
                      onClick={() => {
                        if (isResetting) {
                          setIsResetting(false);
                          setToken('');
                          setHasToken(false);
                        } else {
                          setIsResetting(true);
                        }
                        setConfirmPassword('');
                        setErrors({});
                        setNotification('');
                      }}
                    >
                      {isResetting ? 'Volver a login' : '¿Olvidaste tu contraseña?'}
                    </button>
                  ) : null}
                </div>
              </form>
            )}

            {isResetting && !hasToken && (
              <form className="mt-10" onSubmit={handleRecoverPassword}>
                <div className="mt-7">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0 ${
                      errors.email ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                </div>
                <div className="mt-7">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-500 w-full py-3 rounded-xl text-white shadow-xl hover:shadow-inner focus:outline-none"
                  >
                    {loading ? 'Enviando...' : 'Enviar correo de recuperación'}
                  </button>
                </div>
                <div className="mt-4 flex justify-center items-center">
                  <button
                    type="button"
                    className="text-[#0842A1]"
                    onClick={() => {
                      setIsResetting(false);
                      setErrors({});
                      setNotification('');
                    }}
                  >
                    Volver al login
                  </button>
                </div>
              </form>
            )}

            {isResetting && hasToken && (
              <form className="mt-10" onSubmit={handleResetPassword}>
                <div className="mt-7">
                  <input
                    type="text"
                    placeholder="Token de recuperación"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className={`mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0 ${
                      errors.token ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.token && <p className="text-red-500 text-xs">{errors.token}</p>}
                </div>
                <div className="mt-7">
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={password}
                    onChange={handlePasswordChange}
                    className={`mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0 ${
                      errors.password ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
                  {passwordTips && <p className="text-yellow-600 text-xs mt-1">{passwordTips}</p>}
                </div>
                <div className="mt-7">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-500 w-full py-3 rounded-xl text-white shadow-xl hover:shadow-inner focus:outline-none"
                  >
                    {loading ? 'Actualizando...' : 'Restablecer contraseña'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;