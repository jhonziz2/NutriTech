import React, { useState } from "react";
import { getRecommendations } from "../utils/api";

const Recommendations = () => {
  const [referenceTime, setReferenceTime] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);

  const fetchRecommendations = async () => {
    try {
      setError(null);
      const data = await getRecommendations(referenceTime);
      console.log(data); // Verifica la estructura aquí
      setRecommendations(data.recommended_recipes);
    } catch (err) {
      setError("Error fetching recommendations. Please try again.");
    }
  };
  

  return (
    <div>
      <h2>Get Recipe Recommendations</h2>
      <input
        type="number"
        placeholder="Enter reference time (mins)"
        value={referenceTime}
        onChange={(e) => setReferenceTime(e.target.value)}
      />
      <button onClick={fetchRecommendations}>Fetch Recommendations</button>

      {error && <p style={{ color: "red" }}>{error}</p>}

        <ul>
            {recommendations.map((recipe, index) => {
                // Reemplazar comillas simples por comillas dobles antes de parsear
                const ingredients = JSON.parse(recipe.ingredients.replace(/'/g, '"') || "[]");
                const tags = JSON.parse(recipe.tags.replace(/'/g, '"') || "[]");
                
                return (
                <li key={index}>
                    <h3>{recipe.name}</h3>
                    <p>Time: {recipe.predicted_time.toFixed(2)} mins</p>
                    <p>
                    Tags: {tags.length > 0 ? tags.join(", ") : "No tags available"}
                    </p>
                    <p>
                    Ingredients: {ingredients.length > 0 ? ingredients.join(", ") : "No ingredients available"}
                    </p>
                    <p>Steps: {recipe.steps}</p>
                </li>
                );
            })}
        </ul>



    </div>
  );
};

export default Recommendations;
