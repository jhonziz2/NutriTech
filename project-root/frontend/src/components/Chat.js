import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';  // Para tablas en PDF

const Chat = () => {
  // Generador de ID único para los mensajes
  const generateUniqueId = (() => {
    let counter = 1;
    return () => counter++;
  })();

  // Función mejorada para verificar la autenticación
  const checkAuthentication = () => {
    const token = localStorage.getItem('token');
    

    try {
      // Verificar formato del token
      const parts = token.split('.');
      

      // Decodificar token
      const payload = JSON.parse(atob(parts[1]));
      return payload; // Asegúrate de que el payload contenga el userId
    } catch (error) {
      console.error('Error al decodificar token:', error);
      return null;
    }
  };

  const [userId, setUserId] = useState(() => {
    const auth = checkAuthentication();
    return auth?.sub || null; // Asegúrate de que 'sub' sea el campo correcto
  });

  // Efecto para mantener actualizado el estado de autenticación
  useEffect(() => {
    const updateAuthStatus = () => {
      const auth = checkAuthentication();
      if (auth?.sub !== userId) { // Cambia 'id' a 'sub'
        setUserId(auth?.sub); // Cambia 'id' a 'sub'
      }
    };

    // Verificar autenticación cada 5 segundos
    const authInterval = setInterval(updateAuthStatus, 5000);

    // Verificar cuando el componente se monta
    updateAuthStatus();

    return () => clearInterval(authInterval);
  }, [userId]);

  // Modificar el estado inicial de messages
  const [messages, setMessages] = useState(() => {
    try {
      // Intentar cargar el estado guardado en localStorage
      const savedState = localStorage.getItem('chatState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        if (parsedState.messages && parsedState.messages.length > 0) {
          return parsedState.messages; // Retornar mensajes guardados
        }
      }

      // Cargar recomendaciones y resumen guardados
      const savedRecommendations = localStorage.getItem('lastRecommendations');
      const savedSummary = localStorage.getItem('lastSummary');
      
      if (savedRecommendations && savedSummary) {
        const summary = JSON.parse(savedSummary);
        const recommendations = JSON.parse(savedRecommendations);
        
        return [
          {
            id: generateUniqueId(),
            text: summary,
            sender: 'ai'
          },
          {
            id: generateUniqueId(),
            text: formatRecommendations(recommendations),
            sender: 'ai',
            hasDownloadButton: true
          },
          {
            id: generateUniqueId(),
            text: "Si deseas realizar una nueva consulta, haz clic en el botón 'Limpiar Chat' arriba.",
            sender: 'ai'
          }
        ];
      }
      
      // Mensaje inicial si no hay estado guardado
      return [{
        id: generateUniqueId(),
        text: "Hola, soy tu asistente nutricional. Para recomendarte recetas personalizadas, necesito algunos datos tuyos. ¿Podrías proporcionarme tu peso (kg)?",
        sender: 'ai'
      }];
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      // Mensaje inicial en caso de error
      return [{
        id: generateUniqueId(),
        text: "Hola, soy tu asistente nutricional. Para recomendarte recetas personalizadas, necesito algunos datos tuyos. ¿Podrías proporcionarme tu peso (kg)?",
        sender: 'ai'
      }];
    }
  });

  // Estado para almacenar los datos del usuario
  const [userData, setUserData] = useState(() => {
    const savedState = localStorage.getItem('chatState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      return parsedState.userData || {
        edad: null,
        peso: null,
        altura: null,
        restricciones: [],
        preferencia: '',
        dias: null
      };
    }
    return {
      edad: null,
      peso: null,
      altura: null,
      restricciones: [],
      preferencia: '',
      dias: null
    };
  });

  // Estado para el paso actual del formulario
  const [currentStep, setCurrentStep] = useState(() => {
    const savedState = localStorage.getItem('chatState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      return parsedState.currentStep || 'peso'; // Paso inicial
    }
    return 'peso'; // Paso inicial
  });

  const [inputMessage, setInputMessage] = useState(''); // Estado para el mensaje de entrada
  const messagesEndRef = useRef(null); // Referencia para el final de los mensajes

  // Función para validar la entrada del usuario según el paso actual
  const validateInput = (step, value) => {
    switch (step) {
      case 'peso':
        const peso = parseFloat(value);
        return !isNaN(peso) && peso > 0 && peso < 300; // Validar peso
      case 'altura':
        const altura = parseFloat(value);
        return !isNaN(altura) && altura > 0 && altura < 250; // Validar altura
      case 'edad':
        const edad = parseFloat(value);
        return !isNaN(edad) && edad > 0 && edad < 120; // Validar edad
      case 'restricciones':
        return typeof value === 'string' && value.trim().length > 0; // Validar restricciones
      case 'preferencia':
        return ['salado', 'dulce', 'ambas'].includes(value.toLowerCase()); // Validar preferencia
      case 'dias':
        const dias = parseInt(value);
        return !isNaN(dias) && dias > 0 && dias <= 7; // Validar días
      default:
        return false; // Paso no válido
    }
  };

  // Función para obtener el siguiente mensaje según el paso actual
  const getNextPrompt = (step) => {
    switch (step) {
      case 'peso':
        return 'Ahora, ingresa tu altura en centímetros (cm).'; // Siguiente paso
      case 'altura':
        return '¿Cuál es tu edad?'; // Siguiente paso
      case 'edad':
        return 'Escribe tus restricciones dietéticas separadas por comas (ejemplo: Sin gluten, Vegetariano, Keto, Ninguna, Sin lactosa).'; // Siguiente paso
      case 'restricciones':
        return '¿Prefieres recetas dulces o saladas?'; // Siguiente paso
      case 'preferencia':
        return '¿Para cuántos días necesitas recomendaciones? (máximo 7 días)'; // Siguiente paso
      default:
        return ''; // Sin siguiente paso
    }
  };

  // Función para formatear las recomendaciones en un texto legible
  const formatRecommendations = (data) => {
    const mealOrder = ['Desayuno', 'Almuerzo', 'Merienda'];
    
    return Object.entries(data)
      .map(([day, meals]) => {
        const mealText = mealOrder
          .map(mealType => {
            if (meals[mealType]) {
              return `${mealType}:\n` +
                `- Plato: ${meals[mealType]['Nombre del Plato']}\n` +
                `- Ingredientes: ${meals[mealType]['Ingredientes']}\n` +
                `- Calorías: ${meals[mealType]['Calorías']}\n` +
                `- Tiempo: ${meals[mealType]['Tiempo de Preparación']}\n` +
                `- Procedimiento: ${meals[mealType]['Procedimiento']}\n`;
            }
            return ''; // Sin comida
          })
          .filter(text => text !== '')
          .join('\n');
        return `${day}:\n${mealText}`; // Formato final
      })
      .join('\n\n'); // Separar días
  };

  // Función para generar un PDF con las recomendaciones
  const generatePDF = async (recommendations) => {
    try {
      const token = localStorage.getItem('token');
      

      if (!token || !userId) {
        throw new Error('No se encontró el token de autenticación o el ID de usuario');
      }

      // Crear el PDF
      const doc = new jsPDF('l', 'mm', 'a4');
      
      // Título
      doc.setFontSize(16);
      doc.text('Recomendaciones Nutricionales', 20, 20);

      // Preparar los datos para la tabla
      const tableData = [];
      const dias = recommendations.split(/Día \d+:/);
      dias.shift(); // Eliminar el primer elemento vacío

      dias.forEach((dia, diaIndex) => {
        const diaNum = diaIndex + 1;
        
        // Extraer las secciones de comidas usando índices para evitar duplicados
        const comidas = {};
        let contenido = dia;

        // Extraer Desayuno
        const desayunoMatch = contenido.match(/Desayuno:([\s\S]*?)(?=Almuerzo:|Merienda:|$)/);
        if (desayunoMatch) {
          comidas['Desayuno'] = desayunoMatch[1];
          contenido = contenido.replace(desayunoMatch[0], '');
        }

        // Extraer Almuerzo
        const almuerzoMatch = contenido.match(/Almuerzo:([\s\S]*?)(?=Merienda:|$)/);
        if (almuerzoMatch) {
          comidas['Almuerzo'] = almuerzoMatch[1];
          contenido = contenido.replace(almuerzoMatch[0], '');
        }

        // Extraer Merienda
        const meriendaMatch = contenido.match(/Merienda:([\s\S]*?)$/);
        if (meriendaMatch) {
          comidas['Merienda'] = meriendaMatch[1];
        }

        Object.entries(comidas).forEach(([tipoComida, contenido]) => {
          if (contenido && contenido.trim()) {
            let fila = {
              dia: `Día ${diaNum}`,
              comida: tipoComida,
              plato: '',
              ingredientes: '',
              calorias: '',
              tiempo: '',
              procedimiento: ''
            };

            contenido.split('\n').forEach(line => {
              const trimmedLine = line.trim();
              if (trimmedLine) {
                if (trimmedLine.includes('Plato:')) {
                  fila.plato = trimmedLine.replace('- Plato:', '').trim();
                } else if (trimmedLine.includes('Ingredientes:')) {
                  fila.ingredientes = trimmedLine.replace('- Ingredientes:', '').trim();
                } else if (trimmedLine.includes('Calorías:')) {
                  fila.calorias = trimmedLine.replace('- Calorías:', '').trim();
                } else if (trimmedLine.includes('Tiempo:')) {
                  fila.tiempo = trimmedLine.replace('- Tiempo:', '').trim();
                } else if (trimmedLine.includes('Procedimiento:')) {
                  fila.procedimiento = trimmedLine.replace('- Procedimiento:', '').trim();
                }
              }
            });

            if (Object.values(fila).some(val => val !== '')) {
              tableData.push([
                fila.dia,
                fila.comida,
                fila.plato,
                fila.ingredientes,
                fila.calorias,
                fila.tiempo,
                fila.procedimiento
              ]);
            }
          }
        });
      });

      // Configurar y generar la tabla
      doc.autoTable({
        startY: 30,
        head: [['Día', 'Comida', 'Plato', 'Ingredientes', 'Calorías', 'Tiempo', 'Procedimiento']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [59, 73, 97],
          textColor: 255,
          fontSize: 12,
          halign: 'center'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 20 },    // Día
          1: { cellWidth: 25 },    // Comida
          2: { cellWidth: 35 },    // Plato
          3: { cellWidth: 60 },    // Ingredientes
          4: { cellWidth: 20 },    // Calorías
          5: { cellWidth: 25 },    // Tiempo
          6: { cellWidth: 92 }     // Procedimiento (el resto del espacio disponible)
        },
        margin: { top: 10, right: 10, left: 10, bottom: 10 },
        tableWidth: 277, // 297mm (ancho A4) - 20mm (márgenes)
        didDrawPage: function (data) {
          // Agregar número de página
          doc.setFontSize(8);
          doc.text(
            `Página ${data.pageNumber}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 10
          );
        }
        
      });
      
      // Obtener el PDF como blob
      const pdfBlob = doc.output('blob');
      const pdfFileName = 'recomendaciones_nutricionales.pdf';
      
      // Guardar localmente
      doc.save(pdfFileName);

      // Preparar la petición al servidor
      const formData = new FormData();
      formData.append('file', pdfBlob, pdfFileName);
      formData.append('usuario_id', userId.toString());

      // Configurar headers con el token actualizado
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      };


      // Enviar al servidor
      const response = await axios.post(
        'http://localhost:5000/archivos/archivos',
        formData,
        { headers }
      );

      if (response.status === 200) {
        const successMessage = {
          id: generateUniqueId(),
          text: "El PDF se ha guardado correctamente en tu historial.",
          sender: 'ai'
        };
        setMessages(prev => [...prev, successMessage]);
      }

    } catch (error) {
      console.error('Error completo:', error);
      const errorMessage = {
        id: generateUniqueId(),
        text: `Error: ${error.message || 'Hubo un problema al guardar el PDF'}. Por favor, intenta nuevamente.`,
        sender: 'ai'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Función para renderizar cada mensaje en el chat
  const renderMessage = (message) => {
    const messageText = typeof message.text === 'string' 
      ? message.text 
      : JSON.stringify(message.text);

    return (
      <div 
        key={message.id} 
        className={`flex ${message.sender === 'ai' ? '' : 'justify-end'}`}
      >
        <div 
          className={`p-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${
            message.sender === 'ai' 
              ? 'bg-gray-100' 
              : 'bg-green-500 text-white'
          }`}
        >
          {messageText}
          {message.hasDownloadButton && (
            <button 
              onClick={() => generatePDF(messageText)}
              className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Descargar PDF
            </button>
          )}
        </div>
      </div>
    );
  };

  // Función para manejar el envío de mensajes
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return; // No enviar si el mensaje está vacío

    const userMessage = { 
      id: generateUniqueId(), 
      text: inputMessage, 
      sender: 'user' 
    };
    setMessages(prev => [...prev, userMessage]); // Agregar mensaje del usuario

    // Validar la entrada del usuario
    if (!validateInput(currentStep, inputMessage)) {
      const errorMessage = {
        id: generateUniqueId(),
        text: `Por favor, ingresa un valor válido para ${currentStep}.`,
        sender: 'ai'
      };
      setMessages(prev => [...prev, errorMessage]); // Mensaje de error
      setInputMessage(''); // Limpiar entrada
      return;
    }

    let updatedData = { ...userData }; // Actualizar datos del usuario
    if (currentStep === 'restricciones') {
      updatedData[currentStep] = inputMessage.split(',').map(item => item.trim()); // Guardar restricciones
    } else if (['peso', 'altura', 'edad'].includes(currentStep)) {
      updatedData[currentStep] = parseFloat(inputMessage); // Guardar peso, altura o edad
    } else if (currentStep === 'dias') {
      updatedData[currentStep] = parseInt(inputMessage); // Guardar días
    } else {
      updatedData[currentStep] = inputMessage.toLowerCase(); // Guardar preferencia
    }
    setUserData(updatedData); // Actualizar estado de datos del usuario

    const steps = ['peso', 'altura', 'edad', 'restricciones', 'preferencia', 'dias'];
    const currentIndex = steps.indexOf(currentStep);
    const isLastStep = currentIndex === steps.length - 1; // Verificar si es el último paso

    if (!isLastStep) {
      const nextStep = steps[currentIndex + 1]; // Obtener siguiente paso
      const nextPrompt = getNextPrompt(currentStep); // Obtener siguiente mensaje
      const aiMessage = {
        id: generateUniqueId(),
        text: nextPrompt,
        sender: 'ai'
      };
      setMessages(prev => [...prev, aiMessage]); // Agregar mensaje de AI
      setCurrentStep(nextStep); // Actualizar paso actual
    } else {
      try {
        const loadingMessage = {
          id: generateUniqueId(),
          text: 'Procesando tu solicitud...',
          sender: 'ai'
        };
        setMessages(prev => [...prev, loadingMessage]); // Mensaje de carga

        const requestData = {
          edad: updatedData.edad,
          peso: updatedData.peso,
          altura: updatedData.altura,
          restricciones: updatedData.restricciones,
          preferencia: updatedData.preferencia,
          dias: updatedData.dias
        };

        // Enviar solicitud a la API para obtener recomendaciones
        const response = await axios.post(
          'http://localhost:5000/recommendations/recommendations',
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );

        // Remover el mensaje de carga
        setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));

        const formattedRecommendations = formatRecommendations(response.data); // Formatear recomendaciones
        
        const summaryText = "Resumen de datos:\n" +
          `Peso: ${updatedData.peso} kg\n` +
          `Altura: ${updatedData.altura} cm\n` +
          `Edad: ${updatedData.edad} años\n` +
          `Restricciones: ${updatedData.restricciones.join(', ')}\n` +
          `Preferencia: ${updatedData.preferencia}\n` +
          `Días: ${updatedData.dias}`;

        const summaryMessage = {
          id: generateUniqueId(),
          text: summaryText,
          sender: 'ai'
        };

        const recommendationsMessage = {
          id: generateUniqueId(),
          text: formattedRecommendations,
          sender: 'ai',
          hasDownloadButton: true
        };

        const newConsultationMessage = {
          id: generateUniqueId(),
          text: "Si deseas realizar una nueva consulta, haz clic en el botón 'Limpiar Chat' arriba.",
          sender: 'ai'
        };

        // Guardar el resumen y las recomendaciones en localStorage
        localStorage.setItem('lastSummary', JSON.stringify(summaryText));
        localStorage.setItem('lastRecommendations', JSON.stringify(response.data));

        // Mostrar solo el resumen y las recomendaciones
        setMessages([summaryMessage, recommendationsMessage, newConsultationMessage]);

        // Reiniciar el estado de userData
        setUserData({
          edad: null,
          peso: null,
          altura: null,
          restricciones: [],
          preferencia: '',
          dias: null
        });
        setCurrentStep('peso'); // Reiniciar paso

      } catch (error) {
        console.error('Error:', error);
        const errorMessage = {
          id: generateUniqueId(),
          text: `Error: ${error.response?.data?.error || 'Hubo un problema al obtener las recomendaciones'}. Por favor, intenta nuevamente.`,
          sender: 'ai'
        };
        setMessages(prev => prev.filter(msg => msg.text !== 'Procesando tu solicitud...')); // Remover mensaje de carga
        setMessages(prev => [...prev, errorMessage]); // Mensaje de error
        setCurrentStep('peso'); // Reiniciar paso
      }
    }

    setInputMessage(''); // Limpiar entrada
  };

  // Modificar el useEffect que maneja el almacenamiento
  useEffect(() => {
    try {
      // Guardar el estado actual
      localStorage.setItem('chatState', JSON.stringify({
        messages,
        userData,
        currentStep
      }));
    } catch (error) {
      console.error('Error al guardar el estado:', error);
    }
  }, [messages, userData, currentStep]);

  // Modificar clearChat
  const clearChat = useCallback(() => {
    // Limpiar todo el estado relacionado
    localStorage.removeItem('chatState');
    localStorage.removeItem('lastSummary');
    localStorage.removeItem('lastRecommendations');
    
    // Reiniciar todos los estados
    setMessages([{
      id: generateUniqueId(),
      text: "Hola, soy tu asistente nutricional. Para recomendarte recetas personalizadas, necesito algunos datos tuyos. ¿Podrías proporcionarme tu peso (kg)?",
      sender: 'ai'
    }]);
    
    setUserData({
      edad: null,
      peso: null,
      altura: null,
      restricciones: [],
      preferencia: '',
      dias: null
    });
    
    setCurrentStep('peso'); // Reiniciar paso
    setInputMessage(''); // Limpiar entrada
  }, [generateUniqueId]);

  // Modificar el useEffect que maneja el logout
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Si se elimina el token o se hace logout, limpiar todo
      if ((e.key === 'token' && !e.newValue) || e.key === null) {
        // Limpiar todo el localStorage
        localStorage.clear();
        
        // Reiniciar todos los estados
        setMessages([{
          id: generateUniqueId(),
          text: "Hola, soy tu asistente nutricional. Para recomendarte recetas personalizadas, necesito algunos datos tuyos. ¿Podrías proporcionarme tu peso (kg)?",
          sender: 'ai'
        }]);
        
        setUserData({
          edad: null,
          peso: null,
          altura: null,
          restricciones: [],
          preferencia: '',
          dias: null
        });
        
        setCurrentStep('peso'); // Reiniciar paso
        setInputMessage(''); // Limpiar entrada
      }
    };

    window.addEventListener('storage', handleStorageChange); // Escuchar cambios en el almacenamiento
    return () => window.removeEventListener('storage', handleStorageChange); // Limpiar el listener
  }, [generateUniqueId]);

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); // Desplazar hacia el último mensaje
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage(); // Enviar mensaje al presionar Enter
    }
  };

  // Interceptor para manejar errores de autenticación
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // Token expirado o inválido
          localStorage.removeItem('token');
          setUserId(null);
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="bg-[#2c3442] text-white p-4 flex justify-between items-center lg:pl-4 pl-16">
        <h2 className="text-lg font-semibold text-white">Asistente Nutricional</h2>
        <button 
          onClick={clearChat}
          className="text-sm bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
        >
          Limpiar Chat
        </button>
      </div>
      <div className="flex-1 bg-white overflow-y-auto p-4 space-y-4">
        {messages.map(renderMessage)} 
        <div ref={messagesEndRef} /> 
      </div>
      <div className="p-4 flex items-center space-x-2 border-t">
        <input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)} // Actualizar mensaje de entrada
          onKeyPress={handleKeyPress} // Manejar tecla presionada
          placeholder="Escribe un mensaje..."
          className="flex-1 p-2 border rounded"
        />
        <button 
          onClick={handleSendMessage} 
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default Chat;