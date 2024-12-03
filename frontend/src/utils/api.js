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