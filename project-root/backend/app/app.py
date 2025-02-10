from flask import Flask, Blueprint, request, jsonify
from flask_cors import CORS
from flask_session import Session
from .factory import create_app, db
from .routes.recommendations import recommendations_bp
from .routes.auth import auth_bp


from .routes.archivos import archivos_bp


# Crear la aplicación usando el factory pattern
app = create_app()

# Configurar CORS
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})  # Permitir todas las rutas desde el frontend
CORS(app, resources={r"/archivos/*": {"origins": "http://localhost:3000", "methods": ["GET", "POST", "OPTIONS"]}})

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(recommendations_bp, url_prefix='/recommendations')

app.register_blueprint(archivos_bp, url_prefix='/archivos')

Session(app)

# Crear tablas si no existen
with app.app_context():
    db.create_all()

@app.after_request
def add_cors_headers(response):
    if 'Origin' in request.headers:
        response.headers['Access-Control-Allow-Origin'] = request.headers['Origin']
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS,PUT,DELETE'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@app.route('/auth/api/users/<int:user_id>', methods=['OPTIONS'])
def handle_options(user_id):
    response = jsonify({'status': 'ok'})
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS,PUT,DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

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
    app.run(debug=True, port=5000)
