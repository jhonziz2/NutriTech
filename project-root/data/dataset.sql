-- Crear la base de datos y conectar
CREATE DATABASE recipe_management;
\c recipe_management;

-- Tabla de recetas
CREATE TABLE Recetas (
    recipe_id SERIAL PRIMARY KEY,
    dish_title VARCHAR(255) NOT NULL,
    recipe_category VARCHAR(100),
    recipe_subcategory VARCHAR(100),
    recipe_ingredients TEXT,
    recipe TEXT,
    calories INT,
    preparation_time VARCHAR(50),
    food_type VARCHAR(50)
);

-- Tabla de restricciones dietéticas
CREATE TABLE Restricciones (
    restriction_id SERIAL PRIMARY KEY,
    description VARCHAR(100) NOT NULL
);

-- Tabla de preferencias
CREATE TABLE Preferencias (
    preference_id SERIAL PRIMARY KEY,
    preference_type VARCHAR(50) NOT NULL
);

-- Tabla de usuarios
CREATE TABLE Clientes (
    user_id SERIAL PRIMARY KEY,
    height_cm INT,
    weight_kg INT,
    age INT,
    recommendation_label INT
);

-- Tabla intermedia para relaciones
CREATE TABLE Recetas_Usuarios (
    user_id INT REFERENCES Clientes(user_id),
    recipe_id INT REFERENCES Recetas(recipe_id),
    restriction_id INT REFERENCES Restricciones(restriction_id),
    preference_id INT REFERENCES Preferencias(preference_id),
    PRIMARY KEY (user_id, recipe_id)
);
