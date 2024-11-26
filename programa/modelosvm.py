import pandas as pd
import numpy as np
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, ForeignKey, Table
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.svm import SVR
from sklearn.preprocessing import MinMaxScaler, MultiLabelBinarizer
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error, median_absolute_error
from sklearn.pipeline import Pipeline
import time
import json
from typing import List, Dict, Tuple
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, ForeignKey, Table
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session  
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
    
     # Imprimir resultados
    print("\nResultados de la evaluación del modelo:")
    print(f"Mejores parámetros: {best_params}")
    print(f"Tiempo de entrenamiento: {training_time:.2f} segundos")
    print(f"R² Score: {metrics['r2_score']:.4f}")
    print(f"MSE: {metrics['mse']:.4f}")
    print(f"RMSE: {metrics['rmse']:.4f}")
    print(f"MAE: {metrics['mae']:.4f}")
    print(f"Median AE: {metrics['median_ae']:.4f}")
    print(f"Tiempo de predicción: {metrics['prediction_time']:4f}")

# Agregar esto al final del archivo
if __name__ == "__main__":
    main()
