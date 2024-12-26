import unittest
import joblib  # Usamos joblib para cargar el modelo
from sklearn.metrics import accuracy_score

class TestSVMAccuracy(unittest.TestCase):

    def test_model_accuracy(self):
        # Cargar el modelo SVM desde el archivo
        model = joblib.load('backend/app/models/recipe_recommender.joblib')

        # Simulamos datos de entrada (X_test) y resultados esperados (y_test)
        X_test = [[1.5, 2.3], [2.8, 3.1], [4.1, 1.7]]  # Reemplazar con datos reales de prueba
        y_test = [0, 1, 0]  # Reemplazar con resultados esperados

        # Hacer predicciones con el modelo cargado
        y_pred = model.predict(X_test)

        # Calcular la precisión del modelo
        accuracy = accuracy_score(y_test, y_pred)

        # Comprobar que la precisión sea mayor al 85%
        self.assertGreater(accuracy, 0.85)

if __name__ == '__main__':
    unittest.main()
