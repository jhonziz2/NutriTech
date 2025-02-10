import pandas as pd
import numpy as np
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, ForeignKey, Table
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.svm import SVR
from sklearn.preprocessing import MinMaxScaler, MultiLabelBinarizer, StandardScaler
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error, median_absolute_error
from sklearn.pipeline import Pipeline
import time
import json
from typing import List, Dict, Tuple
import joblib


# Crear Base
Base = declarative_base()

# Tablas de asociación
recipe_ingredient = Table('recipe_ingredient', Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes.id'), primary_key=True),
    Column('ingredient_id', Integer, ForeignKey('ingredients.id'), primary_key=True)
)

recipe_tag = Table('recipe_tag', Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

class Recipe(Base):
    __tablename__ = 'recipes'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    minutes = Column(Float)
    n_steps = Column(Integer)
    n_ingredients = Column(Integer)
    ingredients = relationship('Ingredient', secondary=recipe_ingredient, back_populates='recipes')
    tags = relationship('Tag', secondary=recipe_tag, back_populates='recipes')
    steps = relationship('Step', back_populates='recipe')
    nutrition = relationship('Nutrition', uselist=False, back_populates='recipe')

class Ingredient(Base):
    __tablename__ = 'ingredients'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    recipes = relationship('Recipe', secondary=recipe_ingredient, back_populates='ingredients')

class Tag(Base):
    __tablename__ = 'tags'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    recipes = relationship('Recipe', secondary=recipe_tag, back_populates='tags')

class Step(Base):
    __tablename__ = 'steps'
    id = Column(Integer, primary_key=True)
    recipe_id = Column(Integer, ForeignKey('recipes.id'))
    step_number = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    recipe = relationship('Recipe', back_populates='steps')

class Nutrition(Base):
    __tablename__ = 'nutrition'
    id = Column(Integer, primary_key=True)
    recipe_id = Column(Integer, ForeignKey('recipes.id'), unique=True)
    calories = Column(Float)
    total_fat = Column(Float)
    sugar = Column(Float)
    sodium = Column(Float)
    protein = Column(Float)
    saturated_fat = Column(Float)
    carbohydrates = Column(Float)
    recipe = relationship('Recipe', back_populates='nutrition')

class NormalizedRecipeDB:
    def __init__(self, db_connection_string: str):
        self.engine = create_engine(db_connection_string)
        self.Session = sessionmaker(bind=self.engine)
        
    def create_tables(self):
        Base.metadata.create_all(self.engine)
        
    def drop_tables(self):
        Base.metadata.drop_all(self.engine)

    def safe_parse_list(self, list_str: str) -> List:
        try:
            return json.loads(list_str.replace("'", '"'))
        except:
            return []

    def safe_parse_nutrition(self, nutrition_str: str) -> Dict[str, float]:
        try:
            values = json.loads(nutrition_str.replace("'", '"'))
            return {
                'calories': values[0],
                'total_fat': values[1],
                'sugar': values[2],
                'sodium': values[3],
                'protein': values[4],
                'saturated_fat': values[5],
                'carbohydrates': values[6] if len(values) > 6 else 0.0
            }
        except:
            return {
                'calories': 0.0, 'total_fat': 0.0, 'sugar': 0.0,
                'sodium': 0.0, 'protein': 0.0, 'saturated_fat': 0.0,
                'carbohydrates': 0.0
            }

    def check_recipe_exists(self, session: Session, recipe_name: str) -> bool:
        """Verifica si una receta ya existe en la base de datos"""
        if pd.isna(recipe_name):
            return False
        return session.query(Recipe).filter(Recipe.name == recipe_name).first() is not None

    def get_existing_recipe_names(self, session: Session) -> set:
        """Obtiene los nombres de todas las recetas existentes"""
        return {name for (name,) in session.query(Recipe.name).all()}

    def load_data_from_csv(self, csv_path: str, limit: int = 5000):
        session = self.Session()
        try:
            # Obtener nombres de recetas existentes
            existing_recipes = self.get_existing_recipe_names(session)
            print(f"Recetas existentes en la base de datos: {len(existing_recipes)}")
            
            # Leer CSV y limpiar datos
            df = pd.read_csv(csv_path, nrows=limit)
            df = df.dropna(subset=['name', 'minutes', 'n_steps', 'n_ingredients'])
            df['minutes'] = pd.to_numeric(df['minutes'], errors='coerce')
            df['n_steps'] = pd.to_numeric(df['n_steps'], errors='coerce').astype(int)
            df['n_ingredients'] = pd.to_numeric(df['n_ingredients'], errors='coerce').astype(int)
            
            # Filtrar solo las recetas nuevas
            new_recipes_df = df[~df['name'].isin(existing_recipes)]
            print(f"Nuevas recetas para procesar: {len(new_recipes_df)}")
            
            if len(new_recipes_df) == 0:
                print("No hay nuevas recetas para agregar.")
                return
            
            recipes_added = 0
            recipes_error = 0

            for _, row in new_recipes_df.iterrows():
                try:
                    recipe = Recipe(
                        name=str(row['name']),
                        minutes=float(row['minutes']),
                        n_steps=int(row['n_steps']),
                        n_ingredients=int(row['n_ingredients'])
                    )
                    session.add(recipe)
                    session.flush()
                    
                    ingredients_list = self.safe_parse_list(row['ingredients'])
                    for ing_name in ingredients_list:
                        if pd.isna(ing_name):
                            continue
                        ingredient = session.query(Ingredient).filter_by(name=ing_name).first()
                        if not ingredient:
                            ingredient = Ingredient(name=ing_name)
                            session.add(ingredient)
                        recipe.ingredients.append(ingredient)
                    
                    tags_list = self.safe_parse_list(row['tags'])
                    for tag_name in tags_list:
                        if pd.isna(tag_name):
                            continue
                        tag = session.query(Tag).filter_by(name=tag_name).first()
                        if not tag:
                            tag = Tag(name=tag_name)
                            session.add(tag)
                        recipe.tags.append(tag)
                    
                    steps_list = self.safe_parse_list(row['steps'])
                    for step_num, step_desc in enumerate(steps_list, 1):
                        if pd.isna(step_desc):
                            continue
                        step = Step(recipe_id=recipe.id, step_number=step_num, description=step_desc)
                        session.add(step)
                    
                    nutrition_data = self.safe_parse_nutrition(row['nutrition'])
                    nutrition = Nutrition(recipe_id=recipe.id, **nutrition_data)
                    session.add(nutrition)
                    
                    recipes_added += 1
                    
                    if recipes_added % 100 == 0:
                        session.commit()
                        print(f"Progreso: {recipes_added}/{len(new_recipes_df)} recetas añadidas...")
                
                except Exception as e:
                    recipes_error += 1
                    print(f"Error al procesar receta: {str(e)}")
                    continue
            
            session.commit()
            print(f"\nResumen de la carga:")
            print(f"- Recetas añadidas exitosamente: {recipes_added}")
            print(f"- Recetas con error: {recipes_error}")
            print(f"- Total de recetas en la base de datos: {len(existing_recipes) + recipes_added}")
            
        except Exception as e:
            session.rollback()
            print(f"Error al cargar datos: {e}")
        finally:
            session.close()

    def fetch_data(self, limit: int = 10) -> pd.DataFrame:
        session = self.Session()
        try:
            recipes = session.query(Recipe).limit(limit).all()
            data = []
            for recipe in recipes:
                ingredients_list = [ing.name for ing in recipe.ingredients]
                tags_list = [tag.name for tag in recipe.tags]
                steps_list = [step.description for step in sorted(recipe.steps, key=lambda x: x.step_number)]
                
                nutrition = recipe.nutrition
                if nutrition:
                    nutrition_list = [
                        nutrition.calories,
                        nutrition.total_fat,
                        nutrition.sugar,
                        nutrition.sodium,
                        nutrition.protein,
                        nutrition.saturated_fat,
                        nutrition.carbohydrates
                    ]
                else:
                    nutrition_list = [0.0] * 7

                recipe_dict = {
                    'name': recipe.name,
                    'minutes': recipe.minutes,
                    'n_steps': recipe.n_steps,
                    'n_ingredients': recipe.n_ingredients,
                    'ingredients': str(ingredients_list),
                    'steps': str(steps_list),
                    'tags': str(tags_list),
                    'nutrition': str(nutrition_list)
                }
                data.append(recipe_dict)
            
            return pd.DataFrame(data)
        except Exception as e:
            print(f"Error al recuperar datos: {e}")
            return pd.DataFrame()
        finally:
            session.close()

def prepare_features(data: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    """Preparar características mejoradas"""
    def safe_parse_list(list_str: str, default: List = None) -> List:
        default = default or []
        try:
            parsed = json.loads(list_str.replace("'", '"'))
            return parsed if isinstance(parsed, list) else default
        except:
            return default
    
    # Procesar datos
    data['ingredients_parsed'] = data['ingredients'].apply(lambda x: safe_parse_list(x, []))
    data['nutrition_parsed'] = data['nutrition'].apply(lambda x: safe_parse_list(x, [0.0] * 7))
    data['tags_parsed'] = data['tags'].apply(lambda x: safe_parse_list(x, []))
    
    # Lista de ingredientes comunes
    common_ingredients = [
        'flour', 'sugar', 'salt', 'butter', 'milk', 'egg', 'water', 
        'olive oil', 'garlic', 'onion', 'pepper', 'chicken', 'vanilla'
    ]
    
    # Procesar ingredientes
    def process_ingredients(ingredients_list):
        ingredients_lower = [str(ing).lower() for ing in ingredients_list]
        return pd.Series({
            ing: float(ing in ingredients_lower) 
            for ing in common_ingredients
        })
    
    # Procesar nutrición
    def process_nutrition(nutrition_list):
        try:
            base_nutrition = nutrition_list[:7]
            return base_nutrition
        except:
            return [0.0] * 7
    
    # Generar características
    ingredients_encoded = pd.DataFrame([
        process_ingredients(ingredients) 
        for ingredients in data['ingredients_parsed']
    ])
    
    nutrition_columns = [
        'calories', 'total_fat', 'sugar', 'sodium', 'protein', 
        'saturated_fat', 'carbohydrates'
    ]
    nutrition_data = pd.DataFrame(
        [process_nutrition(nutr) for nutr in data['nutrition_parsed']],
        columns=nutrition_columns
    )
    
    # Características adicionales
    data['steps_complexity'] = data['n_steps'] * data['n_ingredients']
    data['ingredient_density'] = data['n_ingredients'] / data['n_steps'].replace(0, 1)
    
    # Codificar tags de manera más eficiente
    mlb = MultiLabelBinarizer()
    tags_encoded = pd.DataFrame(
        mlb.fit_transform(data['tags_parsed']),
        columns=mlb.classes_,
    )
    
    # Combinar características
    X = pd.concat([
        data[['n_steps', 'n_ingredients', 'steps_complexity', 'ingredient_density']],
        ingredients_encoded,
        nutrition_data,
        tags_encoded
    ], axis=1)
    
    # Manejar valores faltantes
    X = X.fillna(0)
    
    return X, data['minutes'], data[['name', 'steps', 'tags', 'ingredients']]

class ImprovedSVMRecipeRecommender:
    def __init__(self, response_time_threshold: float = 2.0):
        self.response_time_threshold = response_time_threshold
        self.scaler = MinMaxScaler()
        self.model = None
        self.pipeline = None
    
    def create_pipeline(self) -> Pipeline:
        """Crear pipeline con SVM y MinMaxScaler."""
        return Pipeline([
            ('scaler', self.scaler),
            ('svm', SVR(kernel='rbf', cache_size=1000))
        ])
    
    def train_model(self, X_train: np.ndarray, y_train: np.ndarray) -> Tuple[dict, float]:
        """Entrenar el modelo con búsqueda aleatoria de hiperparámetros."""
        self.pipeline = self.create_pipeline()
        
        param_dist = {
            'svm__C': [0.1, 1, 10, 50, 100, 500],
            'svm__gamma': ['scale', 'auto', 0.001, 0.01, 0.1, 1],
            'svm__epsilon': [0.01, 0.1, 0.2, 0.5],
        }
        
        start_time = time.time()
        random_search = RandomizedSearchCV(
            self.pipeline,
            param_distributions=param_dist,
            n_iter=20,  # Más iteraciones para un ajuste mejor
            cv=5,
            scoring='r2',
            n_jobs=-1,
            random_state=42,
            verbose=2
        )
        
        random_search.fit(X_train, y_train)
        training_time = time.time() - start_time
        
        self.model = random_search.best_estimator_
        return random_search.best_params_, training_time

    def evaluate_model(self, X_test: np.ndarray, y_test: np.ndarray) -> dict:
        """Evaluar el modelo entrenado."""
        start_time = time.time()
        y_pred = self.model.predict(X_test)
        prediction_time = time.time() - start_time
        
        return {
            'r2_score': r2_score(y_test, y_pred),
            'mse': mean_squared_error(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'mae': mean_absolute_error(y_test, y_pred),
            'median_ae': median_absolute_error(y_test, y_pred),
            'prediction_time': prediction_time
        }

class ImprovedRecipeRecommender:
    def __init__(self, db_connection_string: str, csv_path: str):
        self.db_connection_string = db_connection_string
        self.csv_path = csv_path
        self.engine = create_engine(db_connection_string)
        self.scaler = MinMaxScaler()
        self.model = None
        self.pipeline = None
        self.feature_columns = None
        self.metadata = None

    def safe_parse_list(self, list_str: str, default: list = None) -> list:
        default = default or []
        try:
            parsed = json.loads(list_str.replace("'", '"'))
            return parsed if isinstance(parsed, list) else default
        except:
            return default

    def prepare_features(self, data: pd.DataFrame):
        # Procesar ingredientes
        common_ingredients = [
            'flour', 'sugar', 'salt', 'butter', 'milk', 'egg', 'water', 
            'olive oil', 'garlic', 'onion', 'pepper', 'chicken', 'vanilla'
        ]
        
        def process_ingredients(ingredients_list):
            ingredients_lower = [str(ing).lower() for ing in ingredients_list]
            return pd.Series({
                ing: float(ing in ingredients_lower) 
                for ing in common_ingredients
            })
        
        def process_nutrition(nutrition_list):
            try:
                base_nutrition = nutrition_list[:7]
                return base_nutrition
            except:
                return [0.0] * 7

        data['ingredients_parsed'] = data['ingredients'].apply(lambda x: self.safe_parse_list(x, []))
        data['nutrition_parsed'] = data['nutrition'].apply(lambda x: self.safe_parse_list(x, [0.0] * 7))
        data['tags_parsed'] = data['tags'].apply(lambda x: self.safe_parse_list(x, []))
        
        ingredients_encoded = pd.DataFrame([
            process_ingredients(ingredients) 
            for ingredients in data['ingredients_parsed']
        ])
        
        nutrition_columns = [
            'calories', 'total_fat', 'sugar', 'sodium', 'protein', 
            'saturated_fat', 'carbohydrates'
        ]
        nutrition_data = pd.DataFrame(
            [process_nutrition(nutr) for nutr in data['nutrition_parsed']],
            columns=nutrition_columns
        )
        
        data['steps_complexity'] = data['n_steps'] * data['n_ingredients']
        data['ingredient_density'] = data['n_ingredients'] / data['n_steps'].replace(0, 1)
        
        mlb = MultiLabelBinarizer()
        tags_encoded = pd.DataFrame(
            mlb.fit_transform(data['tags_parsed']),
            columns=mlb.classes_,
        )
        
        X = pd.concat([
            data[['n_steps', 'n_ingredients', 'steps_complexity', 'ingredient_density']],
            ingredients_encoded,
            nutrition_data,
            tags_encoded
        ], axis=1)
        
        X = X.fillna(0)
        
        return X, data['minutes'], data[['name', 'steps', 'tags', 'ingredients']]

    def train_and_save_model(self, limit: int = 5000, save_path: str = 'recipe_recommender.joblib'):
        # Fetch data from PostgreSQL
        query = f"SELECT * FROM recipes LIMIT {limit}"
        data = pd.read_sql(query, self.engine)
        
        # Prepare features
        X, y, metadata = self.prepare_features(data)
        
        # Store metadata and feature columns for later use
        self.metadata = metadata
        self.feature_columns = X.columns.tolist()
        
        # Filter outliers
        q1, q3 = np.percentile(y, [25, 75])
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        valid_indices = (y >= lower_bound) & (y <= upper_bound)
        
        X, y = X[valid_indices], y[valid_indices]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Create and train pipeline
        self.pipeline = Pipeline([
            ('scaler', self.scaler),
            ('svm', SVR(kernel='rbf', C=10, gamma='scale', epsilon=0.1))
        ])
        
        self.pipeline.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.pipeline.predict(X_test)
        
        print("Model Performance:")
        print(f"R² Score: {r2_score(y_test, y_pred):.4f}")
        print(f"MSE: {mean_squared_error(y_test, y_pred):.4f}")
        print(f"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")
        
        # Save model
        joblib.dump({
            'model': self.pipeline,
            'feature_columns': self.feature_columns
        }, save_path)
        
        print(f"Model saved to {save_path}")

    def recommend_recipes(self, reference_time: float, top_n: int = 5):
        """
        Recommend recipes similar to a reference cooking time
        
        Args:
            reference_time (float): Target cooking time in minutes
            top_n (int): Number of recipes to recommend
        
        Returns:
            list: Top recommended recipe details
        """
        if self.metadata is None:
            raise ValueError("Model not trained. Call train_and_save_model first.")
        
        # Predict cooking times for all recipes
        predicted_times = self.pipeline.predict(self.metadata[self.feature_columns])
        
        # Calculate absolute differences from reference time
        time_differences = np.abs(predicted_times - reference_time)
        
        # Get indices of top_n closest recipes
        top_indices = time_differences.argsort()[:top_n]
        
        recommendations = []
        for idx in top_indices:
            recommendations.append({
                'name': self.metadata.iloc[idx]['name'],
                'predicted_time': predicted_times[idx],
                'steps': self.metadata.iloc[idx]['steps'],
                'tags': self.metadata.iloc[idx]['tags'],
                'ingredients': self.metadata.iloc[idx]['ingredients']
            })
        
        return recommendations
class RecomendadorRecetasNutricionales:
    def __init__(self, cadena_conexion_bd: str, ruta_modelo: str):
        """
        Inicializar el recomendador de recetas nutricionales
        
        Args:
            cadena_conexion_bd (str): Cadena de conexión a la base de datos
            ruta_modelo (str): Ruta al modelo de recomendación pre-entrenado
        """
        self.motor_bd = create_engine(cadena_conexion_bd)
        self.modelo = joblib.load(ruta_modelo)
        self.columnas_caracteristicas = self.modelo['feature_columns']
        self.escalador = StandardScaler()

    def calcular_necesidades_nutricionales(self, peso: float, altura: float, edad: int, genero: str, nivel_actividad: str) -> Dict[str, float]:
        """
        Calcular requerimientos nutricionales diarios basados en el perfil del usuario
        
        Args:
            peso (float): Peso del usuario en kg
            altura (float): Altura del usuario en cm
            edad (int): Edad del usuario en años
            genero (str): Género del usuario ('hombre' o 'mujer')
            nivel_actividad (str): Nivel de actividad del usuario ('sedentario', 'ligero', 'moderado', 'activo', 'muy_activo')
        
        Returns:
            Diccionario con valores nutricionales diarios recomendados
        """
        # Cálculo de Tasa Metabólica Basal (TMB) usando la Ecuación de Mifflin-St Jeor
        if genero.lower() == 'hombre':
            tmb = 10 * peso + 6.25 * altura - 5 * edad + 5
        else:
            tmb = 10 * peso + 6.25 * altura - 5 * edad - 161
        
        # Multiplicadores de nivel de actividad
        multiplicadores_actividad = {
            'sedentario': 1.2,
            'ligero': 1.375,
            'moderado': 1.55,
            'activo': 1.725,
            'muy_activo': 1.9
        }
        
        # Gasto Energético Diario Total (TDEE)
        tdee = tmb * multiplicadores_actividad.get(nivel_actividad.lower(), 1.55)
        
        # Recomendaciones nutricionales
        necesidades_nutricionales = {
            'calorias': tdee,
            'proteina': peso * 1.6,  # Recomendación de proteína: 1.6g por kg de peso corporal
            'carbohidratos': (tdee * 0.45) / 4,  # 45% de calorías de carbohidratos
            'grasa_total': (tdee * 0.25) / 9,  # 25% de calorías de grasa
            'azucar': (tdee * 0.1) / 4,  # Limitar azúcar al 10% de calorías totales
            'sodio': 2300,  # Ingesta diaria de sodio recomendada
            'grasa_saturada': (tdee * 0.07) / 9  # Limitar grasa saturada al 7% de calorías
        }
        
        return necesidades_nutricionales

    def encontrar_recetas_coincidentes(self, necesidades_nutricionales: Dict[str, float], top_n: int = 5) -> List[Dict]:
        """
        Encontrar recetas que coincidan con los requerimientos nutricionales del usuario
        
        Args:
            necesidades_nutricionales (Dict): Requerimientos nutricionales diarios del usuario
            top_n (int): Número de recetas a recomendar
        
        Returns:
            Lista de recetas recomendadas
        """
        # Obtener todas las recetas de la base de datos
        consulta = "SELECT * FROM recipes r JOIN nutrition n ON r.id = n.recipe_id"
        df_recetas = pd.read_sql(consulta, self.motor_bd)
        
        # Normalizar datos nutricionales de las recetas
        nutricion_recetas = df_recetas[['calories', 'total_fat', 'sugar', 'sodium', 'protein', 'saturated_fat', 'carbohydrates']]
        
        # Calcular puntuación de coincidencia nutricional
        def calcular_puntuacion_coincidencia(fila_receta):
            puntuacion = 0
            pesos = {
                'calorias': -0.2,  # Más cerca del objetivo es mejor
                'proteina': 0.3,
                'carbohidratos': 0.2,
                'grasa_total': -0.1,
                'azucar': -0.1,
                'sodio': -0.05,
                'grasa_saturada': -0.05
            }
            
            for nutriente, objetivo in necesidades_nutricionales.items():
                nombre_nutriente = self._mapear_nutriente(nutriente)
                if nombre_nutriente in fila_receta.index:
                    # Calcular diferencia normalizada
                    diferencia_normalizada = abs(fila_receta[nombre_nutriente] - objetivo) / objetivo
                    puntuacion += pesos.get(nutriente, -0.1) * (1 - diferencia_normalizada)
            
            return puntuacion
        
        # Aplicar cálculo de puntuación de coincidencia
        df_recetas['puntuacion_coincidencia'] = nutricion_recetas.apply(calcular_puntuacion_coincidencia, axis=1)
        
        # Ordenar y seleccionar mejores recetas
        mejores_recetas = df_recetas.nlargest(top_n, 'puntuacion_coincidencia')
        
        recomendaciones = []
        for _, receta in mejores_recetas.iterrows():
            recomendaciones.append({
                'nombre': receta['name'],
                'tiempo_coccion': receta['minutes'],
                'nutricion': {
                    'calorias': receta['calories'],
                    'proteina': receta['protein'],
                    'carbohidratos': receta['carbohydrates'],
                    'grasa_total': receta['total_fat'],
                    'azucar': receta['sugar'],
                    'sodio': receta['sodium'],
                    'grasa_saturada': receta['saturated_fat']
                },
                'puntuacion_coincidencia': receta['puntuacion_coincidencia']
            })
        
        return recomendaciones
    
    def _mapear_nutriente(self, nutriente: str) -> str:
        """
        Mapear nombres de nutrientes entre español e inglés
        """
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

def recomendar_recetas_nutricionales(
    peso: float, 
    altura: float, 
    edad: int, 
    genero: str, 
    nivel_actividad: str, 
    cadena_conexion_bd: str = 'postgresql://postgres:12345@localhost:5432/recetas_normalized', 
    ruta_modelo: str = 'recipe_recommender.joblib'
) -> List[Dict]:
    """
    Función principal para recomendar recetas nutricionales basadas en el perfil del usuario
    
    Args:
        peso (float): Peso del usuario en kg
        altura (float): Altura del usuario en cm
        edad (int): Edad del usuario en años
        genero (str): Género del usuario ('hombre' o 'mujer')
        nivel_actividad (str): Nivel de actividad del usuario
        cadena_conexion_bd (str): Cadena de conexión a la base de datos
        ruta_modelo (str): Ruta al modelo de recetas pre-entrenado
    
    Returns:
        Lista de recetas recomendadas
    """
    recomendador = RecomendadorRecetasNutricionales(cadena_conexion_bd, ruta_modelo)
    
    # Calcular necesidades nutricionales
    necesidades_nutricionales = recomendador.calcular_necesidades_nutricionales(
        peso, altura, edad, genero, nivel_actividad
    )
    
    # Encontrar recetas coincidentes
    recetas_recomendadas = recomendador.encontrar_recetas_coincidentes(necesidades_nutricionales)
    
    return recetas_recomendadas



def main():
    # Configuración
    DB_CONNECTION_STRING = 'postgresql://postgres:12345@localhost:5432/recetas_normalized'
    CSV_PATH = r'C:\Users\Jhon\Documents\8vo\Aplicaciones\proyecto\programa\project-root\data\RAW_recipes.csv'
    
    # Inicializar base de datos
    pg_processor = NormalizedRecipeDB(DB_CONNECTION_STRING)
    pg_processor.create_tables()
    pg_processor.load_data_from_csv(CSV_PATH, limit=5000)
    
    # Obtener y preparar datos
    data = pg_processor.fetch_data(limit=5000)
    X, y, metadata = prepare_features(data)
    
     # Filtrar etiquetas atípicas (por ejemplo, recetas de minutos extremos)
    q1, q3 = np.percentile(y, [25, 75])
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    valid_indices = (y >= lower_bound) & (y <= upper_bound)

    X, y = X[valid_indices], y[valid_indices]
    
    # Dividir datos
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Entrenar y evaluar modelo
    recommender = ImprovedSVMRecipeRecommender()
    best_params, training_time = recommender.train_model(X_train, y_train)
    metrics = recommender.evaluate_model(X_test, y_test)
    
    recommendations = []
    X_full = X.copy()
    metadata_full = metadata.copy()
    predicted_times = recommender.model.predict(X_full)
    reference_time = 30
    time_differences = np.abs(predicted_times - reference_time)
    top_n = 3
    top_indices = time_differences.argsort()[:top_n]
    
    for idx in top_indices:
        recommendations.append({
            'name': metadata_full.iloc[idx]['name'],
            'predicted_time': predicted_times[idx],
            'steps': metadata_full.iloc[idx]['steps'],
            'tags': metadata_full.iloc[idx]['tags'],
            'ingredients': metadata_full.iloc[idx]['ingredients']
        })

    

    
     # Imprimir resultados
    #print("\nResultados de la evaluación del modelo:")
    #print(f"Mejores parámetros: {best_params}")
    #print(f"Tiempo de entrenamiento: {training_time:.2f} segundos")
    # print(f"R² Score: {metrics['r2_score']:.4f}")
    #print(f"MSE: {metrics['mse']:.4f}")
    #print(f"RMSE: {metrics['rmse']:.4f}")
    #print(f"MAE: {metrics['mae']:.4f}")
    #print(f"Median AE: {metrics['median_ae']:.4f}")
    # print(f"Tiempo de predicción: {metrics['prediction_time']:4f}")
    
    # print("\nRecommended Recipes:")
    # for rec in recommendations:
    #     print(f"\nName: {rec['name']}")
    #     print(f"Predicted Cooking Time: {rec['predicted_time']:.2f} minutes")
    #     print(f"Ingredients: {rec['ingredients']}")
    #     print(f"Tags: {rec['tags']}")
    
    # try:
    #     joblib.dump({
    #         'model': recommender.model,
    #         'best_params': best_params,
    #         'metrics': metrics,
    #         'feature_columns': X.values.tolist(),  # Save as list of lists
    #         'metadata': {
    #             'names': metadata['name'].tolist(),
    #             'steps': metadata['steps'].tolist(),
    #             'tags': metadata['tags'].tolist(),
    #             'ingredients': metadata['ingredients'].tolist()
    #         }
    #     }, 'recipe_recommender.joblib')
    #     print("Modelo guardado exitosamente en recipe_recommender.joblib")
    # except Exception as e:
    #     print(f"Error al guardar el modelo: {e}")
    
    recomendaciones = recomendar_recetas_nutricionales(
        peso=75,  # kg
        altura=175,  # cm
        edad=30,
        genero='hombre',
        nivel_actividad='moderado'
    )
    
    print("Recetas Recomendadas:")
    for receta in recomendaciones:
        print(f"\nNombre: {receta['nombre']}")
        print("Perfil Nutricional:")
        for nutriente, valor in receta['nutricion'].items():
            print(f"- {nutriente.capitalize()}: {valor:.2f}")
        print(f"Puntuación de Coincidencia: {receta['puntuacion_coincidencia']:.4f}")

# Agregar esto al final del archivo
if __name__ == "__main__":
    main()