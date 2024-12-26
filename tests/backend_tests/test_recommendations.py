import unittest
import joblib
import pandas as pd
from sklearn.metrics import accuracy_score
from app.app import RecomendadorRecetasNutricionales
import sys
import os

# Asegura que la ruta al directorio raíz esté correctamente añadida
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))

class TestRecipeRecommender(unittest.TestCase):
    def setUp(self):
        # Cargar el modelo SVM desde el archivo
        self.modelo = joblib.load(r'C:\Users\Jhon\Documents\8vo\Aplicaciones\proyecto\programa\project-root\backend\app\models\recipe_recommender.joblib')
        
        # Simular algunos datos de prueba
        self.datos_prueba = pd.DataFrame({
            'peso': [75, 80],
            'altura': [175, 180],
            'edad': [30, 25],
            'genero': ['mujer', 'hombre'],
            'nivel_actividad': ['moderado', 'activo']
        })
        
        # Etiquetas esperadas para evaluar la precisión
        self.etiquetas_reales = [1, 0]

    def test_precision_modelo(self):
        # Codificar las variables categóricas
        self.datos_prueba['genero'] = self.datos_prueba['genero'].map({'mujer': 0, 'hombre': 1})
        self.datos_prueba['nivel_actividad'] = self.datos_prueba['nivel_actividad'].map({'moderado': 0, 'activo': 1})
        
        # Realizar predicción
        predicciones = self.modelo.predict(self.datos_prueba)

        # Evaluar la precisión
        precision = accuracy_score(self.etiquetas_reales, predicciones)
        
        # Verificar precisión
        self.assertGreaterEqual(precision, 0.85, f"Precisión del modelo: {precision} es menor al 85%")
    
    def test_calcular_necesidades_nutricionales(self):
        # Simular las necesidades nutricionales
        recomendador = RecomendadorRecetasNutricionales('conexion_bd', 'ruta_modelo')
        necesidades = recomendador.calcular_necesidades_nutricionales(75, 175, 30, 'mujer', 'moderado')
        
        # Verificar valores de nutrición
        self.assertGreaterEqual(necesidades['calorias'], 1500)
        self.assertGreaterEqual(necesidades['proteina'], 120)
        self.assertEqual(necesidades['sodio'], 2300)

if __name__ == '__main__':
    unittest.main()
