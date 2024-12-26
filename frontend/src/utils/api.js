import axios from 'axios';


const BASE_URL = "http://localhost:5000"; // Cambia esto al URL de tu backend en producción
export const getRecommendations = async (referenceTime) => {
    try {
      const response = await fetch(`${BASE_URL}/recommend_recipes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reference_time: referenceTime }),
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      throw error;
    }
  };
  
  export const healthCheck = async () => {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error performing health check:", error);
      throw error;
    }
  };

const instance = axios.create({
    baseURL: 'http://localhost:5000', // Cambia si usas otro puerto
    headers: { 'Content-Type': 'application/json' },
  });
  
export default instance;

// utils/api.js


const API_URL = 'https://openl-translate.p.rapidapi.com/translate';
const API_KEY = '7bca910230msh772022afb580b44p10ca88jsn2c6ec6dc9ff8';
const API_HOST = 'openl-translate.p.rapidapi.com';

export const translateText = async (text, targetLang = 'es') => {
  try {
    const options = {
      method: 'POST',
      url: API_URL,
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': API_HOST,
        'Content-Type': 'application/json'
      },
      data: {
        text,
        target_lang: targetLang
      }
    };

    const response = await axios.request(options);
    console.log('Respuesta de la API:', response); // Log completo de la respuesta

    // Asegúrate de que solo se extraiga el texto traducido
    return response.data.translatedText || text; // Retorna solo el texto traducido
  } catch (error) {
    console.error('Error al traducir el texto:', error.message || error);
    return text; // Si falla, retorna el texto original
  }
};

