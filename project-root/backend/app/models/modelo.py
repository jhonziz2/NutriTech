from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import pandas as pd
import joblib

# Cargar el dataset
df = pd.read_csv(r"C:\Users\Jhon\Documents\8vo\Aplicaciones\proyecto\programa\project-root\backend\app\models\dataset_recetas_svm_ampliado_sin_tildes.csv")

# Preparar los datos
df["Restricciones Dietéticas"] = df["Restricciones Dietéticas"].apply(
    lambda x: ",".join(x) if isinstance(x, list) else x
)
X = df.drop(columns=["Etiqueta de Recomendación"])
y = df["Etiqueta de Recomendación"]

# Identificar características numéricas y categóricas
numeric_features = ["Edad", "Peso (kg)", "Altura (cm)", "Requerimientos Nutricionales (Calorías)"]
categorical_features = ["Tipo de Comida", "Restricciones Dietéticas", "Preferencia"]

# Preprocesamiento
preprocessor = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), numeric_features),
        ("cat", OneHotEncoder(drop="first", handle_unknown="ignore"), categorical_features),
    ]
)

# Pipeline del modelo
svm_pipeline = Pipeline(steps=[
    ("preprocessor", preprocessor),
    ("classifier", SVC(kernel="rbf", probability=True))
])

# Dividir datos
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Entrenar
svm_pipeline.fit(X_train, y_train)

# Evaluar
y_pred = svm_pipeline.predict(X_test)
print(classification_report(y_test, y_pred))

# Guardar modelo
joblib.dump(svm_pipeline, "svm_recipe_recommender.pkl")
