import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hola, soy tu asistente nutricional. Para recomendarte recetas personalizadas, necesito algunos datos tuyos. ¿Podrías proporcionarme tu peso (kg), altura (cm), edad, género y nivel de actividad?",
      sender: 'ai'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [userData, setUserData] = useState({
    peso: null,
    altura: null,
    edad: null,
    genero: null,
    nivelActividad: null
  });
  const [currentStep, setCurrentStep] = useState('peso');
  const messagesEndRef = useRef(null);

  // Pasos de recolección de datos
  const steps = [
    'peso', 'altura', 'edad', 'genero', 'nivelActividad'
  ];

  // Validaciones para cada paso
  const validateInput = (step, value) => {
    switch (step) {
      case 'peso':
        return !isNaN(value) && value > 0 && value < 300;
      case 'altura':
        return !isNaN(value) && value > 0 && value < 250;
      case 'edad':
        return !isNaN(value) && value > 0 && value < 120;
      case 'genero':
        return ['hombre', 'mujer'].includes(value.toLowerCase());
      case 'nivelActividad':
        return ['sedentario', 'ligero', 'moderado', 'activo', 'muy_activo'].includes(value.toLowerCase());
      default:
        return false;
    }
  };

  // Manejar envío de mensaje
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;

    // Añadir mensaje del usuario
    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user'
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);

    // Validar input actual
    if (!validateInput(currentStep, inputMessage)) {
      const errorMessage = {
        id: messages.length + 2,
        text: `Por favor, ingresa un valor válido para ${currentStep}.`,
        sender: 'ai'
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      setInputMessage('');
      return;
    }

    // Actualizar datos de usuario
    setUserData(prev => ({
      ...prev,
      [currentStep]: 
        ['peso', 'altura', 'edad'].includes(currentStep) 
          ? parseFloat(inputMessage) 
          : inputMessage.toLowerCase()
    }));

    // Avanzar al siguiente paso
    const nextStepIndex = steps.indexOf(currentStep) + 1;
    
    if (nextStepIndex < steps.length) {
      const nextStep = steps[nextStepIndex];
      const nextStepMessage = {
        id: messages.length + 2,
        text: getStepPrompt(nextStep),
        sender: 'ai'
      };
      setMessages(prevMessages => [...prevMessages, nextStepMessage]);
      setCurrentStep(nextStep);
    } else {
      // Todos los datos recopilados, hacer recomendación
      try {
        const response = await axios.post('http://localhost:5000/recommend_by_nutrition', userData, { withCredentials: true });
        
        const recetasTexto = response.data.recetas.map((receta, index) => 
          `${index + 1}. ${receta.nombre} (Calorías: ${receta.calorias ? receta.calorias.toFixed(0) : 'N/A'} kcal)`
        ).join('\n');

        const aiResponse = {
          id: messages.length + 2,
          text: `¡Excelente! Basado en tus datos, aquí están mis recomendaciones:\n\nRecetas Personalizadas:\n${recetasTexto}\n\n¿Te gustaría más detalles sobre alguna de estas recetas?`,
          sender: 'ai'
        };

        setMessages(prevMessages => [...prevMessages, aiResponse]);
        
        // Resetear proceso
        setCurrentStep('peso');
      } catch (error) {
        console.error('Error en recomendación:', error);
        const errorMessage = {
          id: messages.length + 2,
          text: "Lo siento, hubo un problema al generar las recomendaciones. Intentemos de nuevo.",
          sender: 'ai'
        };
        setMessages(prevMessages => [...prevMessages, errorMessage]);
        setCurrentStep('peso');
      }
    }

    setInputMessage('');
  };

  // Obtener prompt para cada paso
  const getStepPrompt = (step) => {
    const prompts = {
      'peso': 'Por favor, ingresa tu peso en kilogramos (kg).',
      'altura': 'Ahora, ingresa tu altura en centímetros (cm).',
      'edad': '¿Cuál es tu edad?',
      'genero': '¿Cuál es tu género? (hombre/mujer)',
      'nivelActividad': 'Elige tu nivel de actividad: sedentario, ligero, moderado, activo o muy_activo.'
    };
    return prompts[step];
  };

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Manejar envío con Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Encabezado del Chat */}
      <div className="bg-[#2c3442] text-white p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Asistente Nutricional</h2>
      </div>

      {/* Área de Mensajes */}
      <div className="flex-1 bg-white overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.sender === 'ai' ? 'items-start' : 'justify-end items-start'} space-x-2`}
          >
            {message.sender === 'ai' && (
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">AI</span>
              </div>
            )}
            <div 
              className={`
                p-2 rounded-lg max-w-[70%] 
                ${message.sender === 'ai' 
                  ? 'bg-gray-100 text-black' 
                  : 'bg-green-600 text-white'}
              `}
            >
              {message.text}
            </div>
            {message.sender === 'user' && (
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">U</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Área de Entrada de Mensaje */}
      <div className="bg-white p-4 flex items-center space-x-2 border-t border-gray-300">
        <input 
          type="text" 
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Escribe un mensaje..." 
          className="flex-1 bg-gray-100 text-black p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <button 
          onClick={handleSendMessage}
          className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Chat;