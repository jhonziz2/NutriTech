import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Importar hook para navegación

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState(''); // Para creación de cuenta
  const [isRegistering, setIsRegistering] = useState(false); // Modo login o registro
  const navigate = useNavigate(); // Hook para redirigir

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        // Registro de usuario
        const response = await axios.post('http://localhost:5000/register', {
          nombre,
          email,
          password,
        });
        if (response.status === 201) {
          alert('Cuenta creada con éxito. Inicia sesión.');
          setIsRegistering(false); // Volver al modo login
        }
      } else {
        // Inicio de sesión
        const response = await axios.post(
          'http://localhost:5000/login',
          { email, password },
          { withCredentials: true } // Agregar esta opción
        );
        
        if (response.status === 200) {
          alert('Login exitoso');
          navigate('/home'); // Redirigir a la página Home
        }
      }
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || 'Error desconocido'));
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
              {isRegistering ? 'Crear cuenta' : 'Login'}
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
                </div>
              )}
              <div className="mt-7">
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  className="mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="mt-7">
                <input
                  type="password"
                  placeholder="Contraseña"
                  className="mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="mt-7">
                <button
                  type="submit"
                  className="bg-blue-500 w-full py-3 rounded-xl text-white shadow-xl hover:shadow-inner focus:outline-none transition duration-500 ease-in-out transform hover:-translate-x hover:scale-105"
                >
                  {isRegistering ? 'Crear cuenta' : 'Login'}
                </button>
              </div>
              <div className="mt-7 flex justify-center items-center">
                <label className="mr-2">
                  {isRegistering ? '¿Ya tienes cuenta?' : '¿Eres nuevo?'}
                </label>
                <button
                  type="button"
                  className="text-blue-500"
                  onClick={() => setIsRegistering(!isRegistering)}
                >
                  {isRegistering ? 'Inicia sesión' : 'Crea una cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
