import unittest
import os
import joblib
from app.routes.analytics import analyze_data

class TestSVMIntegration(unittest.TestCase):

    def test_integration(self):
        # Ruta del modelo SVM
        model_path = 'C:/Users/Jhon/Documents/8vo/Aplicaciones/proyecto/programa/project-root/backend/app/models/recipe_recommender.joblib'
        
        # Cargar el modelo desde el archivo .joblib
        model = joblib.load(model_path)

        # Simulamos un flujo completo de datos de prueba
        input_data = {
            'X_test': [[...], [...]],  # Reemplaza con datos de prueba reales
            'y_test': [0, 1, 0]       # Reemplaza con resultados esperados
        }

        # Ejecutamos el análisis del modelo
        accuracy = analyze_data(input_data, model)  # Asegúrate de que 'analyze_data' use el modelo cargado

        # Comprobamos si la precisión es correcta y si el archivo CSV existe
        self.assertGreaterEqual(accuracy, 0.85, "La precisión es menor al 85%")
        self.assertTrue(os.path.exists('resultados.csv'))
        self.assertTrue(os.path.exists('resultados.json'))

if __name__ == '__main__':
    unittest.main()
