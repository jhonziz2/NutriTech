import React, { useState, useEffect, useCallback } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement
} from 'chart.js';

// Configuración de axios
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para agregar el token
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState('all');

  const fetchUserProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await axiosInstance.get('/auth/api/user/profile');
      
      if (response.data.status === 200) {
        localStorage.setItem('user', JSON.stringify({
          username: response.data.nombre,
          type: response.data.tipo
        }));

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

  const calculateKPIs = useCallback((recommendations, selectedMeal = 'all') => {
    let totalCalorias = 0;
    let totalTiempo = 0;
    const ingredientesSet = new Set();

    Object.entries(recommendations).forEach(([day, meals]) => {
      const convertToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        if (timeStr.includes('>60')) return 90;
        if (timeStr.includes('-')) {
          const [min, max] = timeStr.split('-').map(t => parseInt(t));
          return (min + max) / 2;
        }
        return parseInt(timeStr) || 0;
      };

      // Si hay un filtro, procesar solo la comida seleccionada
      const comidasAProcesar = selectedMeal === 'all' 
        ? ['Desayuno', 'Almuerzo', 'Merienda']
        : [selectedMeal];

      comidasAProcesar.forEach(comida => {
        if (meals[comida]) {
          totalCalorias += parseInt(meals[comida].Calorías) || 0;
          totalTiempo += convertToMinutes(meals[comida]['Tiempo de Preparación']);

          const ingredientes = meals[comida].Ingredientes
            .split(' ')
            .map(i => i.trim().toLowerCase())
            .filter(i => i.length > 2);

          ingredientes.forEach(i => ingredientesSet.add(i));
        }
      });
    });

    return {
      totalIngredientes: ingredientesSet.size,
      totalCalorias,
      totalTiempo
    };
  }, []);

  const fetchNutritionalData = useCallback(async () => {
    try {
      const savedRecommendations = localStorage.getItem('lastRecommendations');
      
      if (savedRecommendations) {
        const recommendations = JSON.parse(savedRecommendations);
        
        // Calcular KPIs
        const kpisData = calculateKPIs(recommendations, selectedMeal);
        setKpis(kpisData);

        // Procesar datos para el gráfico de calorías
        const calorias = {
          desayuno: [],
          almuerzo: [],
          merienda: []
        };

        const tiempos = {
          desayuno: [],
          almuerzo: [],
          merienda: []
        };

        Object.entries(recommendations).forEach(([day, meals]) => {
          // Función para convertir el tiempo a minutos
          const convertToMinutes = (timeStr) => {
            if (!timeStr) return 0;
            if (timeStr.includes('>60')) return 90;
            if (timeStr.includes('-')) {
              const [min, max] = timeStr.split('-').map(t => parseInt(t));
              return (min + max) / 2;
            }
            return parseInt(timeStr) || 0;
          };

          if (meals.Desayuno?.Calorías) {
            calorias.desayuno.push(parseInt(meals.Desayuno.Calorías));
            tiempos.desayuno.push(convertToMinutes(meals.Desayuno['Tiempo de Preparación']));
          }
          if (meals.Almuerzo?.Calorías) {
            calorias.almuerzo.push(parseInt(meals.Almuerzo.Calorías));
            tiempos.almuerzo.push(convertToMinutes(meals.Almuerzo['Tiempo de Preparación']));
          }
          if (meals.Merienda?.Calorías) {
            calorias.merienda.push(parseInt(meals.Merienda.Calorías));
            tiempos.merienda.push(convertToMinutes(meals.Merienda['Tiempo de Preparación']));
          }
        });

        const getPromedio = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

        // Calcular calorías por día
        const caloriasPorDia = Object.entries(recommendations).map(([day, meals]) => {
          let totalCalorias = 0;
          ['Desayuno', 'Almuerzo', 'Merienda'].forEach(comida => {
            if (meals[comida]?.Calorías) {
              totalCalorias += parseInt(meals[comida].Calorías) || 0;
            }
          });
          return {
            day: day.replace('Día ', ''),
            calorias: totalCalorias
          };
        }).sort((a, b) => parseInt(a.day) - parseInt(b.day));

        if (calorias.desayuno.length || calorias.almuerzo.length || calorias.merienda.length) {
          setChartData({
            calories: {
              labels: ['Desayuno', 'Almuerzo', 'Merienda'],
              datasets: [{
                data: [
                  getPromedio(calorias.desayuno),
                  getPromedio(calorias.almuerzo),
                  getPromedio(calorias.merienda)
                ],
                backgroundColor: [
                  'rgba(75, 192, 192, 0.6)',
                  'rgba(54, 162, 235, 0.6)',
                  'rgba(153, 102, 255, 0.6)',
                ],
                borderWidth: 1,
              }]
            },
            time: {
              labels: ['Desayuno', 'Almuerzo', 'Merienda'],
              datasets: [{
                data: [
                  getPromedio(tiempos.desayuno),
                  getPromedio(tiempos.almuerzo),
                  getPromedio(tiempos.merienda)
                ],
                backgroundColor: [
                  'rgba(255, 159, 64, 0.6)',
                  'rgba(75, 192, 192, 0.6)',
                  'rgba(153, 102, 255, 0.6)',
                ],
                borderWidth: 1,
              }]
            },
            caloriesByDay: {
              labels: caloriasPorDia.map(d => `Día ${d.day}`),
              datasets: [{
                data: caloriasPorDia.map(d => d.calorias),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.1
              }]
            }
          });
        }
      }
    } catch (error) {
      console.error('Error al procesar datos nutricionales:', error);
      setError('Error al cargar los datos nutricionales');
    }
  }, [selectedMeal, calculateKPIs]);

  useEffect(() => {
    fetchUserProfile();
    fetchNutritionalData();
  }, [fetchUserProfile, fetchNutritionalData]);

  // Opciones simplificadas para todos los gráficos
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        font: { size: 16 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          font: { size: 14 }
        }
      }
    }
  };

  const caloriesOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      title: {
        ...chartOptions.plugins.title,
        text: 'Calorías por Comida'
      }
    },
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        title: {
          ...chartOptions.scales.y.title,
          text: 'Calorías'
        }
      }
    }
  };

  const timeOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      title: {
        ...chartOptions.plugins.title,
        text: 'Tiempo de Preparación por Comida'
      }
    },
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        title: {
          ...chartOptions.scales.y.title,
          text: 'Minutos'
        }
      }
    }
  };

  const lineOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      title: {
        ...chartOptions.plugins.title,
        text: 'Calorías Totales por Día'
      }
    },
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        title: {
          ...chartOptions.scales.y.title,
          text: 'Calorías'
        }
      }
    }
  };

  // Función para filtrar datos según la comida seleccionada
  const filterDataByMeal = (data, meal) => {
    if (meal === 'all') return data;
    
    return {
      labels: [meal],
      datasets: [{
        ...data.datasets[0],
        data: [data.datasets[0].data[['Desayuno', 'Almuerzo', 'Merienda'].indexOf(meal)]],
        backgroundColor: [data.datasets[0].backgroundColor[['Desayuno', 'Almuerzo', 'Merienda'].indexOf(meal)]],
        borderColor: [data.datasets[0].borderColor?.[['Desayuno', 'Almuerzo', 'Merienda'].indexOf(meal)]]
      }]
    };
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return (
    <Layout>
      <div className="w-full h-full p-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard Nutricional</h1>
            <div className="flex items-center space-x-2">
              <label className="text-gray-700">Filtrar por comida:</label>
              <select 
                value={selectedMeal}
                onChange={(e) => setSelectedMeal(e.target.value)}
                className="border rounded-md p-2 bg-white"
              >
                <option value="all">Todas las comidas</option>
                <option value="Desayuno">Desayuno</option>
                <option value="Almuerzo">Almuerzo</option>
                <option value="Merienda">Merienda</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="mb-4 text-red-500">{error}</div>
          )}
          {chartData && kpis ? (
            <>
              {/* KPIs Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {selectedMeal === 'all' ? 'Total de Ingredientes' : `Ingredientes ${selectedMeal}`}
                  </h3>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-green-600">{kpis.totalIngredientes}</span>
                    <span className="ml-2 text-gray-600">ingredientes únicos</span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {selectedMeal === 'all' ? 'Calorías Totales' : `Calorías ${selectedMeal}`}
                  </h3>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-blue-600">{kpis.totalCalorias}</span>
                    <span className="ml-2 text-gray-600">calorías/día</span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {selectedMeal === 'all' ? 'Tiempo Total de Preparación' : `Tiempo ${selectedMeal}`}
                  </h3>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-purple-600">{kpis.totalTiempo}</span>
                    <span className="ml-2 text-gray-600">minutos/día</span>
                  </div>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 gap-6">
                {/* Gráfico de línea para calorías por día */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <Line 
                    data={selectedMeal === 'all' ? chartData.caloriesByDay : {
                      ...chartData.caloriesByDay,
                      datasets: [{
                        ...chartData.caloriesByDay.datasets[0],
                        data: chartData.caloriesByDay.datasets[0].data.map(d => d/3) // Aproximación para una comida
                      }]
                    }} 
                    options={lineOptions} 
                  />
                </div>
                
                {/* Gráficos de barras */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <Bar 
                      data={filterDataByMeal(chartData.calories, selectedMeal)} 
                      options={caloriesOptions} 
                    />
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <Bar 
                      data={filterDataByMeal(chartData.time, selectedMeal)} 
                      options={timeOptions} 
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <p className="text-gray-600">
                No hay datos disponibles. Por favor, complete primero el cuestionario en la página de inicio.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard; 