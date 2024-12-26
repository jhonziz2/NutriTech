from flask import Blueprint, request, jsonify, session
from ..factory import db, bcrypt
import uuid
from werkzeug.security import generate_password_hash
from ..models import Usuario
from ..utils.email_utils import send_email
from datetime import datetime, timedelta
 # Solo importa db y bcrypt

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    from ..models.usuario import Usuario  # Ruta relativa
    data = request.json
   
    email = data.get('email')
    password = data.get('password')
    user = Usuario.query.filter_by(email=email).first()

    if user and bcrypt.check_password_hash(user.password, password):
        session['user_id'] = user.id  # Establece la sesión
        session.permanent = True
        return jsonify({'message': 'Login exitoso', 'status': 200}), 200

    return jsonify({'message': 'Email o contraseña incorrectos'}), 401


@auth_bp.route('/register', methods=['POST'])
def register():
    from ..models.usuario import Usuario  # Ruta relativa
    data = request.json
    nombre = data.get('nombre')
    email = data.get('email')
    password = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')

    # Verificar si el correo ya está registrado
    existing_user = Usuario.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'message': 'El correo electrónico ya está registrado.'}), 400

    new_user = Usuario(nombre=nombre, email=email, password=password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'Usuario registrado con éxito'}), 201

# Ruta para cerrar sesión (logout)
@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    # Verificar si hay una sesión activa
    if 'user_id' in session:
        session.pop('user_id', None)  # Eliminar el ID del usuario de la sesión
        return jsonify({
            'message': 'Sesión cerrada exitosamente',
            'status': 200
        }), 200
    
    return jsonify({
        'message': 'No hay sesión activa',
        'status': 401
    }), 401


# Ruta para obtener el perfil del usuario
@auth_bp.route('/api/user/profile', methods=['GET'])

def get_username():
    from ..models.usuario import Usuario  # Ruta relativa
    # Verificar si hay una sesión activa
    if 'user_id' not in session:
        return jsonify({
            'error': 'No autenticado', 
            'status': 401
        }), 401

    try:
        # Obtener el usuario utilizando el ID de la sesión
        user = Usuario.query.get(session['user_id'])
        if user:
            return jsonify({
                'nombre': user.nombre,
                'status': 200
            }), 200
        
        return jsonify({
            'error': 'Usuario no encontrado', 
            'status': 404
        }), 404

    except Exception as e:
        # Loguear el error
        print(f"Error al obtener nombre de usuario: {str(e)}")
        return jsonify({
            'error': 'Error interno del servidor',
            'status': 500
        }), 500
        
@auth_bp.route('/recover-password', methods=['POST'])
def recover_password():
    """
    Genera un token para recuperación de contraseña y lo envía al correo del usuario.
    """
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({'message': 'El correo electrónico es obligatorio.'}), 400

    # Buscar usuario por email
    user = Usuario.query.filter_by(email=email).first()

    if not user:
        return jsonify({'message': 'El correo electrónico no está registrado.'}), 404

    # Generar token y fecha de expiración
    reset_token = str(uuid.uuid4())
    token_expiration = datetime.utcnow() + timedelta(hours=1)  # El token expira en 1 hora

    # Guardar token y expiración en la base de datos
    user.reset_token = reset_token
    user.token_expiration = token_expiration
    db.session.commit()

    # Crear enlace de recuperación
    recovery_link = f"{reset_token}"

    # Enviar correo
    try:
        send_email(
            recipient=user.email,
            subject="Recuperación de contraseña",
            body=f"""
Hola {user.nombre},

Has solicitado restablecer tu contraseña. Copia el siguiente token para crear una nueva contraseña. Este token será válido por 1 hora:

{recovery_link}

Si no solicitaste este cambio, ignora este correo.
"""
        )
    except Exception as e:
        return jsonify({'message': f'Error al enviar el correo: {str(e)}'}), 500

    return jsonify({'message': 'Correo de recuperación enviado con éxito.'}), 200

# Ruta para restablecer contraseña con el token
@auth_bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    """
    Restablece la contraseña del usuario utilizando un token válido.
    """
    data = request.json
    new_password = data.get('password')

    if not new_password or len(new_password) < 6:
        return jsonify({'message': 'La contraseña debe tener al menos 6 caracteres.'}), 400

    # Buscar usuario por token
    user = Usuario.query.filter_by(reset_token=token).first()

    if not user:
        return jsonify({'message': 'Token inválido.'}), 400

    # Verificar si el token ha expirado
    if user.token_expiration < datetime.utcnow():
        return jsonify({'message': 'El token ha expirado.'}), 400

    # Actualizar contraseña y limpiar el token
    user.password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user.reset_token = None
    user.token_expiration = None
    db.session.commit()

    return jsonify({'message': 'Contraseña restablecida con éxito.'}), 200
        



