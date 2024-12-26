from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_session import Session
from datetime import timedelta
import joblib
import os
import numpy as np
import pandas as pd
from sqlalchemy import create_engine
from typing import List, Dict
from sklearn.preprocessing import StandardScaler
from flask import request, jsonify
from .factory import create_app, db
from .models.usuario import Usuario
from .routes.auth import auth_bp


# Crear la aplicación usando el factory pattern
app = create_app()

# Configuración de CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True  # Importante para manejar sesiones
    }
})

# Añadir headers después de cada solicitud
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# Ruta del modelo
MODEL_PATH = r'C:\Users\Jhon\Documents\8vo\Aplicaciones\proyecto\programa\project-root\backend\app\models\recipe_recommender.joblib'

# Registrar el Blueprint para autenticación
app.register_blueprint(auth_bp, url_prefix='/auth')

# Inicialización de extensiones

Session(app)


# Crear tablas si no existen
with app.app_context():
    db.create_all()

# Clase recomendador
class RecomendadorRecetasNutricionales:
    def __init__(self, cadena_conexion_bd: str, ruta_modelo: str):
        self.motor_bd = create_engine(cadena_conexion_bd)
        self.modelo = joblib.load(ruta_modelo)
        self.columnas_caracteristicas = self.modelo['feature_columns']
        self.escalador = StandardScaler()

    def calcular_necesidades_nutricionales(self, peso, altura, edad, genero, nivel_actividad) -> Dict[str, float]:
        if not nivel_actividad:
            nivel_actividad = 'moderado'  # Valor por defecto si falta

        if genero.lower() == 'hombre':
            tmb = 10 * peso + 6.25 * altura - 5 * edad + 5
        else:
            tmb = 10 * peso + 6.25 * altura - 5 * edad - 161

        multiplicadores = {
            'sedentario': 1.2,
            'ligero': 1.375,
            'moderado': 1.55,
            'activo': 1.725,
            'muy_activo': 1.9
        }
        tdee = tmb * multiplicadores.get(nivel_actividad.lower(), 1.55)

        return {
            'calorias': tdee,
            'proteina': peso * 1.6,
            'carbohidratos': (tdee * 0.45) / 4,
            'grasa_total': (tdee * 0.25) / 9,
            'azucar': (tdee * 0.1) / 4,
            'sodio': 2300,
            'grasa_saturada': (tdee * 0.07) / 9
        }

    def encontrar_recetas_coincidentes(self, necesidades_nutricionales, top_n=5):
        consulta = "SELECT * FROM recipes r JOIN nutrition n ON r.id = n.recipe_id"
        df_recetas = pd.read_sql(consulta, self.motor_bd)

        nutricion_recetas = df_recetas[['calories', 'protein', 'carbohydrates', 'total_fat', 'sugar', 'sodium', 'saturated_fat']]

        def calcular_puntuacion(fila):
            puntuacion = 0
            pesos = {'calorias': -0.2, 'proteina': 0.3, 'carbohidratos': 0.2, 'grasa_total': -0.1, 'azucar': -0.1}
            for nutriente, objetivo in necesidades_nutricionales.items():
                nombre_nutriente = self._mapear_nutriente(nutriente)
                if nombre_nutriente in fila:
                    diferencia = abs(fila[nombre_nutriente] - objetivo) / max(objetivo, 1)
                    puntuacion += pesos.get(nutriente, -0.1) * (1 - diferencia)
            return puntuacion

        df_recetas['puntuacion'] = nutricion_recetas.apply(calcular_puntuacion, axis=1)
        mejores_recetas = df_recetas.nlargest(top_n, 'puntuacion')

        recomendaciones = []
        for _, receta in mejores_recetas.iterrows():
            receta_id = int(receta['id']) if not isinstance(receta['id'], pd.Series) else receta['id'].iloc[0]
            recomendaciones.append({
                'nombre': receta['name'],
                'calorias': receta['calories'],
                'ingredientes': self.obtener_ingredientes(receta_id),
                'pasos': self.obtener_pasos(receta_id)
            })

        return recomendaciones

    def obtener_ingredientes(self, receta_id: int) -> List[str]:
        consulta_ingredientes = """
            SELECT i.name 
            FROM ingredients i 
            JOIN recipe_ingredient ri ON i.id = ri.ingredient_id 
            WHERE ri.recipe_id = %s
        """
        ingredientes = pd.read_sql(consulta_ingredientes, self.motor_bd, params=(int(receta_id),))
        return ingredientes['name'].tolist()

    def obtener_pasos(self, receta_id: int) -> List[str]:
        consulta_pasos = """
            SELECT step_number, description 
            FROM steps 
            WHERE recipe_id = %s 
            ORDER BY step_number
        """
        pasos = pd.read_sql(consulta_pasos, self.motor_bd, params=(receta_id,))
        return pasos['description'].tolist()

    def _mapear_nutriente(self, nutriente: str) -> str:
        mapeo = {
            'calorias': 'calories',
            'proteina': 'protein',
            'carbohidratos': 'carbohydrates',
            'grasa_total': 'total_fat',
            'azucar': 'sugar',
            'sodio': 'sodium',
            'grasa_saturada': 'saturated_fat'
        }
        return mapeo.get(nutriente, nutriente)

# Endpoint para recomendaciones nutricionales
@app.route('/recommend_by_nutrition', methods=['POST', 'GET'])
def recommend_by_nutrition():
    if request.method == 'GET':
        peso, altura, edad, genero, nivel_actividad = 75, 175, 30, 'mujer', 'moderado'
    else:
        data = request.json
        peso = data.get('peso')
        altura = data.get('altura')
        edad = data.get('edad')
        genero = data.get('genero')
        nivel_actividad = data.get('nivel_actividad', 'moderado')  # Valor por defecto

    if None in (peso, altura, edad, genero):
        return jsonify({'error': 'Datos incompletos'}), 400

    recomendador = RecomendadorRecetasNutricionales(app.config['SQLALCHEMY_DATABASE_URI'], MODEL_PATH)
    necesidades = recomendador.calcular_necesidades_nutricionales(peso, altura, edad, genero, nivel_actividad)
    recetas = recomendador.encontrar_recetas_coincidentes(necesidades)

    return jsonify({'necesidades': necesidades, 'recetas': recetas}), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Recurso no encontrado',
        'status': 404
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Error interno del servidor',
        'status': 500
    }), 500

if __name__ == '__main__':
    if not os.path.exists(MODEL_PATH):
        print(f"ADVERTENCIA: La ruta del modelo no existe: {MODEL_PATH}")
    app.run(debug=True, port=5000)
