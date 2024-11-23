import pandas as pd
import numpy as np
from sqlalchemy import create_engine, Column, Integer, String, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.svm import SVR
from sklearn.preprocessing import MinMaxScaler, MultiLabelBinarizer
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error, median_absolute_error
from sklearn.pipeline import Pipeline
from sklearn.feature_selection import SelectKBest, f_regression
import time
import ast
import json
from typing import Tuple, List, Dict
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import pandas as pd
import json
from typing import List, Dict


Base = declarative_base()

# Association Tables for Many-to-Many Relationships
recipe_ingredient = Table('recipe_ingredient', Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes.id'), primary_key=True),
    Column('ingredient_id', Integer, ForeignKey('ingredients.id'), primary_key=True)
)

recipe_tag = Table('recipe_tag', Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

# Main Tables
class Recipe(Base):
    __tablename__ = 'recipes'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    minutes = Column(Float)
    n_steps = Column(Integer)
    n_ingredients = Column(Integer)
    
    # Relationships
    ingredients = relationship('Ingredient', secondary=recipe_ingredient, back_populates='recipes')
    tags = relationship('Tag', secondary=recipe_tag, back_populates='recipes')
    steps = relationship('Step', back_populates='recipe')
    nutrition = relationship('Nutrition', uselist=False, back_populates='recipe')

class Ingredient(Base):
    __tablename__ = 'ingredients'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    
    # Relationships
    recipes = relationship('Recipe', secondary=recipe_ingredient, back_populates='ingredients')

class Tag(Base):
    __tablename__ = 'tags'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    
    # Relationships
    recipes = relationship('Recipe', secondary=recipe_tag, back_populates='tags')

class Step(Base):
    __tablename__ = 'steps'
    
    id = Column(Integer, primary_key=True)
    recipe_id = Column(Integer, ForeignKey('recipes.id'))
    step_number = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    
    # Relationships
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
    
    # Relationships
    recipe = relationship('Recipe', back_populates='nutrition')

class NormalizedRecipeDB:
    def __init__(self, db_connection_string: str):
        """Initialize database connection"""
        self.engine = create_engine(db_connection_string)
        self.Session = sessionmaker(bind=self.engine)
        
    def create_tables(self):
        """Create all database tables"""
        Base.metadata.create_all(self.engine)
        
    def drop_tables(self):
        """Drop all database tables"""
        Base.metadata.drop_all(self.engine)

    def safe_parse_list(self, list_str: str) -> List:
        """Safely parse string representations of lists"""
        try:
            return json.loads(list_str.replace("'", '"'))
        except:
            return []

    def safe_parse_nutrition(self, nutrition_str: str) -> Dict[str, float]:
        """Safely parse nutrition information"""
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

    def load_data_from_csv(self, csv_path: str, limit: int = 5000):
        """Load and normalize data from CSV file"""
        session = self.Session()
        try:
            # Read CSV file
            df = pd.read_csv(csv_path, nrows=limit)
            
            # Process each recipe
            for _, row in df.iterrows():
                # Create recipe
                recipe = Recipe(
                    name=row['name'],
                    minutes=float(row['minutes']),
                    n_steps=row['n_steps'],
                    n_ingredients=row['n_ingredients']
                )
                session.add(recipe)
                session.flush()  # Get recipe ID
                
                # Process ingredients
                ingredients_list = self.safe_parse_list(row['ingredients'])
                for ing_name in ingredients_list:
                    # Get or create ingredient
                    ingredient = session.query(Ingredient).filter_by(name=ing_name).first()
                    if not ingredient:
                        ingredient = Ingredient(name=ing_name)
                        session.add(ingredient)
                    recipe.ingredients.append(ingredient)
                
                # Process tags
                tags_list = self.safe_parse_list(row['tags'])
                for tag_name in tags_list:
                    # Get or create tag
                    tag = session.query(Tag).filter_by(name=tag_name).first()
                    if not tag:
                        tag = Tag(name=tag_name)
                        session.add(tag)
                    recipe.tags.append(tag)
                
                # Process steps
                steps_list = self.safe_parse_list(row['steps'])
                for step_num, step_desc in enumerate(steps_list, 1):
                    step = Step(
                        recipe_id=recipe.id,
                        step_number=step_num,
                        description=step_desc
                    )
                    session.add(step)
                
                # Process nutrition
                nutrition_data = self.safe_parse_nutrition(row['nutrition'])
                nutrition = Nutrition(
                    recipe_id=recipe.id,
                    **nutrition_data
                )
                session.add(nutrition)
                
            session.commit()
            print(f"Successfully loaded {len(df)} recipes")
            
        except Exception as e:
            session.rollback()
            print(f"Error loading data: {e}")
        finally:
            session.close()

    def get_recipe_details(self, recipe_id: int) -> Dict:
        """Retrieve complete recipe details"""
        session = self.Session()
        try:
            recipe = session.query(Recipe).get(recipe_id)
            if not recipe:
                return {}
            
            return {
                'id': recipe.id,
                'name': recipe.name,
                'minutes': recipe.minutes,
                'ingredients': [ing.name for ing in recipe.ingredients],
                'tags': [tag.name for tag in recipe.tags],
                'steps': [{'number': step.step_number, 'description': step.description} 
                         for step in sorted(recipe.steps, key=lambda x: x.step_number)],
                'nutrition': {
                    'calories': recipe.nutrition.calories,
                    'total_fat': recipe.nutrition.total_fat,
                    'sugar': recipe.nutrition.sugar,
                    'sodium': recipe.nutrition.sodium,
                    'protein': recipe.nutrition.protein,
                    'saturated_fat': recipe.nutrition.saturated_fat,
                    'carbohydrates': recipe.nutrition.carbohydrates
                } if recipe.nutrition else {}
            }
        finally:
            session.close()
            
    def fetch_data(self, limit: int = 10) -> pd.DataFrame:
        """
        Obtener datos de recetas en formato DataFrame
        """
        session = self.Session()
        try:
            # Consultar recetas con sus relaciones
            recipes = session.query(Recipe).limit(limit).all()
            
            # Crear lista para almacenar los datos
            data = []
            for recipe in recipes:
                # Obtener ingredientes y tags como listas
                ingredients_list = [ing.name for ing in recipe.ingredients]
                tags_list = [tag.name for tag in recipe.tags]
                
                # Obtener pasos ordenados
                steps_list = [step.description for step in 
                            sorted(recipe.steps, key=lambda x: x.step_number)]
                
                # Obtener nutrición
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

                # Crear diccionario con los datos
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
            
            # Convertir a DataFrame
            df = pd.DataFrame(data)
            return df
            
        except Exception as e:
            print(f"Error al recuperar datos: {e}")
            return pd.DataFrame()
        finally:
            session.close()

    def search_by_ingredient(self, ingredient_name: str, limit: int = 10) -> List[Dict]:
        """
        Buscar recetas por ingrediente
        """
        session = self.Session()
        try:
            recipes = session.query(Recipe)\
                .join(Recipe.ingredients)\
                .filter(Ingredient.name.ilike(f'%{ingredient_name}%'))\
                .limit(limit)\
                .all()
            
            return [self.get_recipe_details(recipe.id) for recipe in recipes]
        finally:
            session.close()

    def search_by_tag(self, tag_name: str, limit: int = 10) -> List[Dict]:
        """
        Buscar recetas por etiqueta
        """
        session = self.Session()
        try:
            recipes = session.query(Recipe)\
                .join(Recipe.tags)\
                .filter(Tag.name.ilike(f'%{tag_name}%'))\
                .limit(limit)\
                .all()
            
            return [self.get_recipe_details(recipe.id) for recipe in recipes]
        finally:
            session.close()

def prepare_features(data: pd.DataFrame, max_samples: int = None) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    """
    Preparar y optimizar características para el modelofetch_data
    """
    print("Columnas disponibles:", data.columns)
    
    def safe_parse_list(list_str: str, default: List = None) -> List:
        """Parsear listas de manera segura"""
        default = default or []
        try:
            # Intentar parsear como JSON o lista de Python
            parsed = json.loads(list_str.replace("'", '"'))
            return parsed if isinstance(parsed, list) else default
        except:
            return default
    
    def process_ingredients(ingredients_list: List[str], ingredient_list: List[str]) -> pd.Series:
        ingredients_lower = [str(ing).lower() for ing in ingredients_list]
        return pd.Series({ing: float(ing in ingredients_lower) for ing in ingredient_list})
    
    def process_nutrition(nutrition_list: List[float]) -> List[float]:
        try:
            return nutrition_list[:6] if len(nutrition_list) >= 6 else [0.0] * 6
        except:
            return [0.0] * 6
    
    # Parsear columnas de manera segura
    data['ingredients_parsed'] = data['ingredients'].apply(lambda x: safe_parse_list(x, []))
    data['nutrition_parsed'] = data['nutrition'].apply(lambda x: safe_parse_list(x, [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]))
    data['tags_parsed'] = data['tags'].apply(lambda x: safe_parse_list(x, []))
    
    # Preparar codificaciones
    mlb = MultiLabelBinarizer()
    tags_encoded = pd.DataFrame(
        mlb.fit_transform(data['tags_parsed']), 
        columns=mlb.classes_, 
        index=data.index
    )
    
    ingredient_list = ['flour', 'sugar', 'salt', 'butter', 'milk']
    nutrition_columns = ['calories', 'total_fat', 'sugar', 'sodium', 'protein', 'saturated_fat']
    
    ingredients_encoded = data['ingredients_parsed'].apply(
        lambda x: process_ingredients(x, ingredient_list)
    )
    
    nutrition_data = pd.DataFrame(
        data['nutrition_parsed'].apply(process_nutrition).tolist(),
        columns=nutrition_columns,
        index=data.index
    )
    
    numeric_features = ['n_steps', 'n_ingredients']
    available_features = [col for col in numeric_features if col in data.columns]
    
    X = pd.concat([
        data[available_features], 
        tags_encoded, 
        ingredients_encoded,
        nutrition_data
    ], axis=1)
    
    y = data['minutes']
    
    metadata = data[['name', 'steps', 'tags', 'ingredients']]
    
    # Rellenar valores faltantes
    X = X.fillna(X.mean())
    
    return X, y, metadata

class SVMRecipeRecommender:
    def __init__(self, response_time_threshold: float = 2.0, max_features: int = 10):
        """
        Inicializar recomendador de recetas optimizado
        """
        self.response_time_threshold = response_time_threshold
        self.max_features = max_features
        self.scaler = MinMaxScaler()
        self.feature_selector = SelectKBest(f_regression, k=max_features)
        self.model = None
        self.pipeline = None
        self.feature_names = None
    
    def create_pipeline(self) -> Pipeline:
        """Crear pipeline optimizado"""
        return Pipeline([
            ('scaler', self.scaler),
            ('feature_selector', self.feature_selector),
            ('svm', SVR(kernel='rbf', cache_size=1000))
        ])
    
    def train_model(self, X_train: np.ndarray, y_train: np.ndarray) -> Tuple[dict, float]:
        """Entrenar modelo con parámetros optimizados"""
        self.pipeline = self.create_pipeline()
        
        if isinstance(X_train, pd.DataFrame):
            self.feature_names = X_train.columns.tolist()
        
        param_dist = {
            'svm__C': [0.1, 1, 10],
            'svm__gamma': ['scale', 'auto'],
        }
        
        start_time = time.time()
        random_search = RandomizedSearchCV(
            self.pipeline,
            param_distributions=param_dist,
            n_iter=3,
            cv=3,
            scoring='neg_mean_squared_error',
            n_jobs=-1,
            random_state=42
        )
        
        random_search.fit(X_train, y_train)
        training_time = time.time() - start_time
        
        self.model = random_search.best_estimator_
        return random_search.best_params_, training_time
    
    def evaluate_model(self, X_test: np.ndarray, y_test: np.ndarray) -> dict:
        """Evaluar modelo con métricas y tiempo de predicción"""
        start_time = time.time()
        y_pred = self.model.predict(X_test)
        prediction_time = time.time() - start_time
        
        metrics = {
            'r2_score': r2_score(y_test, y_pred),
            'mse': mean_squared_error(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'mae': mean_absolute_error(y_test, y_pred),
            'median_ae': median_absolute_error(y_test, y_pred),
            'prediction_time': prediction_time,
            'samples_per_second': len(X_test) / prediction_time if prediction_time > 0 else 0,
            'meets_time_threshold': prediction_time <= self.response_time_threshold
        }
        
        return metrics

    def recommend_steps(self, metadata_test: pd.DataFrame, y_test: pd.Series, top_n: int = 5) -> pd.DataFrame:
        """Devolver detalles de recetas recomendadas"""
        recommendations = metadata_test.head(top_n).copy()
        recommendations['minutes'] = y_test.head(top_n).values
        return recommendations[['name', 'ingredients', 'steps', 'tags', 'minutes']]

def main():
    # Configuración de conexión PostgreSQL
    DB_CONNECTION_STRING = 'postgresql://postgres:12345@localhost:5432/recetas_normalized'
    
    # Ruta del archivo CSV
    CSV_PATH = r'C:\Users\Jhon\Documents\8vo\Aplicaciones\proyecto\programa\RAW_recipes.csv\RAW_recipes.csv'
    
    # Inicializar procesador PostgreSQL
    pg_processor = NormalizedRecipeDB(DB_CONNECTION_STRING)
    
    # Crear tablas
    pg_processor.create_tables()
    
    # Cargar datos del CSV a PostgreSQL (solo 10 datos)
    pg_processor.load_data_from_csv(CSV_PATH, limit=5000)
    
    # Obtener datos de PostgreSQL (solo 10 datos)
    data = pg_processor.fetch_data(limit=5000)
    
    if len(data) == 0:
        print("No hay datos para procesar.")
        return
    
    # Preparar características
    X, y, metadata = prepare_features(data)
    
    # Dividir datos
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Asegurar índices consistentes
    X_test.reset_index(drop=True, inplace=True)
    metadata_test = metadata.iloc[X_test.index].reset_index(drop=True)
    
    # Crear recomendador y entrenar modelo
    recommender = SVMRecipeRecommender(response_time_threshold=2.0, max_features=10)
    best_params, training_time = recommender.train_model(X_train, y_train)
    
    # Evaluar el modelo
    metrics = recommender.evaluate_model(X_test, y_test)
    
    # Obtener recomendaciones
    recommendations = recommender.recommend_steps(metadata_test, y_test, top_n=5)

    print("\nBuscando recetas con 'chicken':")
    chicken_recipes = pg_processor.search_by_ingredient('chicken', limit=3)
    for recipe in chicken_recipes:
        print(f"- {recipe['name']}")
    
    # Ejemplo de búsqueda por etiqueta
    print("\nBuscando recetas con tag 'mexican':")
    mexican_recipes = pg_processor.search_by_tag('mexican', limit=3)
    for recipe in mexican_recipes:
        print(f"- {recipe['name']}")
        
    # Imprimir resultados
    print("\nResultados de la evaluación del modelo:")
    print(f"R² Score: {metrics['r2_score']:.4f}")
    print(f"MSE: {metrics['mse']:.4f}")
    print(f"RMSE: {metrics['rmse']:.4f}")
    print(f"MAE: {metrics['mae']:.4f}")
    print(f"Median AE: {metrics['median_ae']:.4f}")
    
    print(f"\nRendimiento temporal:")
    print(f"Tiempo de predicción: {metrics['prediction_time']:.4f} segundos")
    print(f"Muestras por segundo: {metrics['samples_per_second']:.2f}")
    print(f"Cumple umbral de tiempo: {'Sí' if metrics['meets_time_threshold'] else 'No'}")
    
    print("\nRecomendaciones de recetas:")
    print(recommendations)

if __name__ == "__main__":
    main()