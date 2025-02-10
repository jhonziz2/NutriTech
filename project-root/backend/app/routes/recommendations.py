from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
import joblib

# Crear el blueprint
recommendations_bp = Blueprint('recommendations', __name__)

# Cargar modelo y dataset
MODEL_PATH = r'C:\Users\Jhon\Documents\8vo\Aplicaciones\proyecto\programa\project-root\backend\app\models\svm_recipes_model.joblib'
DATASET_PATH = r'C:\Users\Jhon\Documents\8vo\Aplicaciones\proyecto\programa\project-root\backend\app\models\final_recipes.csv'

try:
    model = joblib.load(MODEL_PATH)
    recipes = pd.read_csv(DATASET_PATH)
except Exception as e:
    print(f"Error al cargar modelo o dataset: {e}")
    recipes = pd.DataFrame()

@recommendations_bp.route('/recommendations', methods=['POST'])
def get_recommendations():
    try:
        data = request.get_json()

        # Validar datos de entrada
        required_fields = ['edad', 'peso', 'altura', 'restricciones', 'preferencia', 'dias']
        missing_fields = [field for field in required_fields if field not in data or data[field] is None]
        if missing_fields:
            return jsonify({"error": f"Faltan campos obligatorios: {', '.join(missing_fields)}."}), 400

        # Datos proporcionados por el usuario
        edad = data['edad']
        peso = data['peso']
        altura = data['altura']
        restricciones = data['restricciones']
        preferencia = data['preferencia']
        dias = data['dias']

        # Validar que los valores sean del tipo esperado
        if not (isinstance(edad, int) and 0 < edad < 120):
            return jsonify({"error": "La edad debe ser un número entero entre 1 y 120."}), 400
        if not (isinstance(peso, (int, float)) and 0 < peso < 300):
            return jsonify({"error": "El peso debe ser un número entre 1 y 300."}), 400
        if not (isinstance(altura, (int, float)) and 0 < altura < 250):
            return jsonify({"error": "La altura debe ser un número entre 1 y 250."}), 400
        if not (isinstance(restricciones, list) and all(isinstance(r, str) for r in restricciones)):
            return jsonify({"error": "Las restricciones deben ser una lista de cadenas de texto."}), 400
        if preferencia.lower() not in ['salado', 'dulce']:
            return jsonify({"error": "La preferencia debe ser 'salado' o 'dulce'."}), 400
        if not (isinstance(dias, int) and 0 < dias <= 7):
            return jsonify({"error": "Los días deben ser un número entero entre 1 y 7."}), 400

        # Diccionario para organizar recomendaciones por día
        days_recommendations = {}

        # Guardar las recetas seleccionadas para cada tipo de comida
        used_recipes = {
            "Desayuno": set(),
            "Almuerzo": set(),
            "Merienda": set()
        }

        for day in range(1, dias + 1):
            daily_plan = {}

            for meal_type in ["Desayuno", "Almuerzo", "Merienda"]:
                sample_input = {
                    "Edad": edad,
                    "Peso (kg)": peso,
                    "Altura (cm)": altura,
                    "Restricciones Dietéticas": ", ".join(restricciones),
                    "Preferencia": preferencia,
                    "Tipo de Comida": meal_type
                }

                sample_df = pd.DataFrame([sample_input])
                predicted_label = model.predict(sample_df)[0]

                # Filtro específico para desayunos
                if meal_type == "Desayuno":
                    available_recipes = recipes[
                        (recipes['Etiqueta de Recomendación'] == predicted_label) &
                        (recipes['Tipo de Comida'] == meal_type) &
                        (~recipes['Dish_Title'].isin(used_recipes[meal_type])) &
                        (recipes['Dish_Title'].str.contains("torta|batido|flan", case=False))
                    ]
                else:
                    # Filtro general para almuerzo y merienda
                    available_recipes = recipes[
                        (recipes['Etiqueta de Recomendación'] == predicted_label) &
                        (recipes['Tipo de Comida'] == meal_type) &
                        (~recipes['Dish_Title'].isin(used_recipes[meal_type]))
                    ]

                if available_recipes.empty:
                    return jsonify({"error": f"No hay suficientes recetas únicas para {meal_type}."}), 400

                selected_recipe = available_recipes.sample(1).to_dict(orient='records')[0]
                used_recipes[meal_type].add(selected_recipe["Dish_Title"])

                # Convertir valores a tipos nativos de Python
                for key, value in selected_recipe.items():
                    if isinstance(value, (np.int64, np.float64)):
                        selected_recipe[key] = value.item()

                # Agregar la receta al plan diario
                daily_plan[meal_type] = {
                    "Nombre del Plato": selected_recipe["Dish_Title"],
                    "Ingredientes": selected_recipe["Recipe_ingredients"],
                    "Restricciones": selected_recipe["Restricciones Dietéticas"],
                    "Calorías": selected_recipe["Requerimientos Nutricionales (Calorías)"],
                    "Tiempo de Preparación": selected_recipe["Tiempo de Preparación"],
                    "Procedimiento": selected_recipe["Recipe"]
                }

            # Agregar el plan diario al diccionario final
            days_recommendations[f"Día {day}"] = daily_plan

        # Retornar el resultado como un JSON
        return jsonify(days_recommendations)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

