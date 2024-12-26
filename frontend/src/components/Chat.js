import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { translateText } from '../utils/api'; // Importa la utilidad de traducción

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

  const steps = ['peso', 'altura', 'edad', 'genero', 'nivelActividad'];

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

  const getStepPrompt = (step) => {
    const prompts = {
      peso: 'Por favor, ingresa tu peso en kilogramos (kg).',
      altura: 'Ahora, ingresa tu altura en centímetros (cm).',
      edad: '¿Cuál es tu edad?',
      genero: '¿Cuál es tu género? (hombre/mujer)',
      nivelActividad: 'Elige tu nivel de actividad: sedentario, ligero, moderado, activo o muy_activo.'
    };
    return prompts[step];
  };

  const handleSendMessage = async () => {
    const translateLargeText = async (text, targetLang = 'es') => {
      const MAX_CHUNK_SIZE = 500;
      const chunks = [];
    
      // Divide el texto en bloques de tamaño limitado
      for (let i = 0; i < text.length; i += MAX_CHUNK_SIZE) {
        const chunk = text.substring(i, i + MAX_CHUNK_SIZE);
        console.log('Bloque:', chunk); // Agregar un log para ver los bloques
        chunks.push(chunk);
      }
    
      const translatedChunks = [];
    
      // Traduce cada bloque de texto
      for (const chunk of chunks) {
        try {
          const translated = await translateText(chunk, targetLang);
          console.log('Traducido:', translated); // Agregar un log para ver la traducción de cada bloque
          translatedChunks.push(translated);
        } catch (error) {
          console.error('Error al traducir un bloque:', error.message || error);
          translatedChunks.push(chunk); // Si falla, añade el texto original
        }
      }
    
      // Une los bloques traducidos
      const translatedText = translatedChunks.join(' ');
      console.log('Texto traducido completo:', translatedText); // Verifica el texto traducido completo
      return translatedText;
    };
    
  
    if (inputMessage.trim() === '') return;
  
    const userMessage = { id: messages.length + 1, text: inputMessage, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
  
    if (!validateInput(currentStep, inputMessage)) {
      const errorMessage = {
        id: messages.length + 2,
        text: `Por favor, ingresa un valor válido para ${currentStep}.`,
        sender: 'ai'
      };
      setMessages((prev) => [...prev, errorMessage]);
      setInputMessage('');
      return;
    }
  
    setUserData((prev) => ({
      ...prev,
      [currentStep]: ['peso', 'altura', 'edad'].includes(currentStep)
        ? parseFloat(inputMessage)
        : inputMessage.toLowerCase()
    }));
  
    const nextStepIndex = steps.indexOf(currentStep) + 1;
  
    if (nextStepIndex < steps.length) {
      const nextStep = steps[nextStepIndex];
      const nextStepMessage = {
        id: messages.length + 2,
        text: getStepPrompt(nextStep),
        sender: 'ai'
      };
      setMessages((prev) => [...prev, nextStepMessage]);
      setCurrentStep(nextStep);
    } else {
      try {
        const response = await axios.post(
          'http://localhost:5000/recommend_by_nutrition',
          userData,
          { withCredentials: true }
        );
  
        const recetasTexto = response.data.recetas
          .map((receta, i) => `${i + 1}. ${receta.nombre} (Calorías: ${receta.calorias?.toFixed(0) || 'N/A'} kcal)`)
          .join('\n');
  
        const recommendationText = `¡Excelente! Basado en tus datos, aquí están mis recomendaciones:\n\n${recetasTexto}`;
  
        // Llamada a la función de traducción
        const translatedText = await translateLargeText(recommendationText, 'es');
  
        const aiResponse = {
          id: messages.length + 2,
          text: translatedText,
          sender: 'ai'
        };
        setMessages((prev) => [...prev, aiResponse]);
        setCurrentStep('peso');
      } catch (error) {
        console.error('Error:', error.message);
        setMessages((prev) => [
          ...prev,
          { id: messages.length + 2, text: 'Hubo un problema al obtener las recomendaciones.', sender: 'ai' }
        ]);
        setCurrentStep('peso');
      }
    }
  
    setInputMessage('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="bg-[#2c3442] text-white p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Asistente Nutricional</h2>
      </div>
      <div className="flex-1 bg-white overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'ai' ? '' : 'justify-end'}`}>
            <div className={`p-2 rounded-lg ${message.sender === 'ai' ? 'bg-gray-100' : 'bg-green-500 text-white'}`}>
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 flex items-center space-x-2 border-t">
        <input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Escribe un mensaje..."
          className="flex-1 p-2 border rounded"
        />
        <button onClick={handleSendMessage} className="bg-green-500 text-white p-2 rounded">
          Enviar
        </button>
      </div>
    </div>
  );
};

export default Chat;
