import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [token, setToken] = useState('');
  const [errors, setErrors] = useState({});
  const [passwordTips, setPasswordTips] = useState('');
  const navigate = useNavigate();

  const validatePassword = (value) => {
    const tips = [];
    if (value.length < 6) {
      tips.push('Debe tener al menos 6 caracteres.');
    }
    if (!/[A-Za-z]/.test(value)) {
      tips.push('Debe incluir al menos una letra');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (isResetting && !hasToken) {
      if (!email.trim()) {
        setErrors({ email: 'El correo electrónico es obligatorio.' });
        return;
      }
      try {
        const response = await axios.post('http://localhost:5000/auth/recover-password', {
          email,
        });
        if (response.status === 200) {
          alert('Correo de recuperación enviado. Revisa tu bandeja de entrada.');
          setToken('token');
          setHasToken(true);
          setPassword('');
        }
      } catch (error) {
        alert('Error: ' + (error.response?.data?.message || 'Error desconocido'));
      }
      return;
    }

    const newErrors = {};
    if (isRegistering || (isResetting && hasToken)) {
      if (isRegistering && !nombre.trim()) {
        newErrors.nombre = 'El nombre es obligatorio.';
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) {
        newErrors.email = 'El correo electrónico es obligatorio.';
      } else if (!emailRegex.test(email)) {
        newErrors.email = 'El correo electrónico no es válido.';
      }
      const passwordIssues = validatePassword(password);
      if (!password.trim()) {
        newErrors.password = 'La contraseña es obligatoria.';
      } else if (passwordIssues.length > 0) {
        newErrors.password = passwordIssues.join(' ');
      }
    } else {
      if (!email.trim()) {
        newErrors.email = 'El correo electrónico es obligatorio.';
      }
      if (!password.trim()) {
        newErrors.password = 'La contraseña es obligatoria.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (isRegistering) {
        const response = await axios.post('http://localhost:5000/auth/register', {
          nombre,
          email,
          password,
        });
        if (response.status === 201) {
          alert('Cuenta creada con éxito. Inicia sesión.');
          setIsRegistering(false);
        }
      } else if (isResetting && hasToken) {
        const response = await axios.post(`http://localhost:5000/auth/reset-password/${token}`, {
          password,
        });
        if (response.status === 200) {
          alert('Contraseña restablecida con éxito. Ahora puedes iniciar sesión.');
          setToken('');
          setHasToken(false);
          setPassword('');
          setIsResetting(false);
        }
      } else {
        const response = await axios.post(
          'http://localhost:5000/auth/login',
          { email, password },
          { withCredentials: true }
        );
        if (response.status === 200) {
          alert('Login exitoso');
          navigate('/home');
        }
      }
    } catch (error) {
      if (error.response?.data?.message === 'El correo electrónico ya está registrado.') {
        setErrors({ email: 'El correo electrónico ya está registrado.' });
      } else {
        alert('Error: ' + (error.response?.data?.message || 'Error desconocido'));
      }
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
              {isResetting
                ? hasToken
                  ? 'Restablecer contraseña'
                  : 'Recuperar contraseña'
                : isRegistering
                ? 'Crear cuenta'
                : 'Login'}
            </label>
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
                      onClick={() => setIsRegistering(!isRegistering)}
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
                    }}
                  >
                    {isResetting ? 'Volver a login' : '¿Olvidaste tu contraseña?'}
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;