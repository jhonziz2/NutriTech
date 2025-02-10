from flask import Blueprint, request, jsonify, session
from ..factory import db, bcrypt
import uuid
from werkzeug.security import generate_password_hash
from ..models import Usuario
from ..utils.email_utils import send_email
from datetime import datetime, timedelta
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
import pytz  # Agregar esta importación


 # Solo importa db y bcrypt

auth_bp = Blueprint('auth', __name__)

# Variable global para almacenar las horas de expiración
token_config = {'horas_expiracion': 24}

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 400,
                'message': 'No se proporcionaron datos'
            }), 400

        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({
                'status': 400,
                'message': 'Email y contraseña son requeridos'
            }), 400

        user = Usuario.query.filter_by(email=email).first()
        
        if user and bcrypt.check_password_hash(user.password, password):
            # Usar zona horaria local
            tz = pytz.timezone('America/Guayaquil')
            current_time = datetime.now(tz)
            expires = timedelta(hours=token_config['horas_expiracion'])
            
            access_token = create_access_token(
                identity=str(user.id),
                expires_delta=expires
            )
            
            # Actualizar la expiración en la base de datos
            user.token_expiration = current_time + expires
            db.session.commit()

            return jsonify({
                'status': 200,
                'token': access_token,
                'user': {
                    'id': user.id,
                    'nombre': user.nombre,
                    'email': user.email,
                    'tipo': user.tipo
                }
            }), 200
        
        return jsonify({
            'status': 401,
            'message': 'Credenciales inválidas'
        }), 401
        
    except Exception as e:
        print(f"Error en login: {str(e)}")
        return jsonify({
            'status': 500,
            'message': f'Error del servidor: {str(e)}'
        }), 500


@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 400,
                'message': 'No se proporcionaron datos'
            }), 400

        nombre = data.get('nombre')
        email = data.get('email')
        password = data.get('password')
        tipo = data.get('tipo')

        # Validar que todos los campos requeridos estén presentes
        if not all([nombre, email, password, tipo]):
            return jsonify({
                'status': 400,
                'message': 'Todos los campos son obligatorios'
            }), 400

        # Verificar si el correo ya está registrado
        existing_user = Usuario.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({
                'status': 400,
                'message': 'El correo electrónico ya está registrado'
            }), 400

        # Si el correo no existe, crear el nuevo usuario
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = Usuario(
            nombre=nombre,
            email=email,
            password=hashed_password,
            tipo=tipo
        )

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            'status': 201,
            'message': 'Usuario registrado con éxito'
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error en registro: {str(e)}")
        return jsonify({
            'status': 500,
            'message': f'Error del servidor: {str(e)}'
        }), 500

# Ruta para cerrar sesión (logout)
@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    try:
        # No necesitamos verificar el token para el logout
        # Solo enviamos una respuesta exitosa
        return jsonify({
            'status': 200,
            'message': 'Logout exitoso'
        }), 200
    except Exception as e:
        print(f"Error en logout: {str(e)}")
        return jsonify({
            'status': 500,
            'message': f'Error del servidor: {str(e)}'
        }), 500


# Ruta para obtener el perfil del usuario
@auth_bp.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    try:
        # Obtener el ID del usuario del token y convertirlo a entero
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({
                'status': 401,
                'message': 'Token inválido o expirado'
            }), 401

        try:
            user_id = int(current_user_id)
        except ValueError:
            return jsonify({
                'status': 422,
                'message': 'ID de usuario inválido'
            }), 422

        user = Usuario.query.get(user_id)
        if not user:
            return jsonify({
                'status': 404,
                'message': 'Usuario no encontrado'
            }), 404

        return jsonify({
            'status': 200,
            'nombre': user.nombre,
            'email': user.email,
            'tipo': user.tipo
        }), 200

    except Exception as e:
        print(f"Error en get_user_profile: {str(e)}")
        return jsonify({
            'status': 500,
            'message': 'Error interno del servidor: ' + str(e)
        }), 500

# Endpoint para actualizar el perfil del usuario
@auth_bp.route('/api/user/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    try:
        # Obtener el ID del usuario del token
        current_user_id = get_jwt_identity()
        user = Usuario.query.get(int(current_user_id))
        
        if not user:
            return jsonify({
                'status': 404,
                'message': 'Usuario no encontrado'
            }), 404
            
        data = request.json
        
        # Verificar la contraseña actual
        if not data.get('currentPassword'):
            return jsonify({
                'status': 400,
                'message': 'Se requiere la contraseña actual'
            }), 400
            
        if not bcrypt.check_password_hash(user.password, data['currentPassword']):
            return jsonify({
                'status': 401,
                'message': 'Contraseña actual incorrecta'
            }), 401
            
        # Actualizar nombre si se proporciona
        if 'nombre' in data:
            user.nombre = data['nombre']
            
        # Actualizar contraseña si se proporciona una nueva
        if 'newPassword' in data and data['newPassword']:
            user.password = bcrypt.generate_password_hash(data['newPassword']).decode('utf-8')
            
        db.session.commit()
        
        return jsonify({
            'status': 200,
            'message': 'Perfil actualizado exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 500,
            'message': str(e)
        }), 500

@auth_bp.route('/actualizar-horas-token', methods=['POST'])
@jwt_required()
def actualizar_horas_token():
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 400,
                'message': 'No se proporcionaron datos'
            }), 400

        horas = data.get('horas')
        
        try:
            horas = int(horas)
        except (TypeError, ValueError):
            return jsonify({
                'status': 400,
                'message': 'Las horas deben ser un número válido'
            }), 400
        
        if not isinstance(horas, int) or horas < 1 or horas > 72:
            return jsonify({
                'status': 400,
                'message': 'Las horas deben ser un número entre 1 y 72'
            }), 400

        # Actualizar la configuración global
        token_config['horas_expiracion'] = horas
        
        # Usar zona horaria local (America/Guayaquil para Ecuador)
        tz = pytz.timezone('America/Guayaquil')
        current_time = datetime.now(tz)
        new_expiration = current_time + timedelta(hours=horas)
        
        # Actualizar todos los usuarios activos
        usuarios = Usuario.query.filter(Usuario.token_expiration.isnot(None)).all()
        for usuario in usuarios:
            usuario.token_expiration = new_expiration
        
        db.session.commit()
        
        return jsonify({
            'status': 200,
            'message': f'Duración del token actualizada a {horas} horas'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error en actualizar_horas_token: {str(e)}")
        return jsonify({
            'status': 500,
            'message': f'Error del servidor: {str(e)}'
        }), 500


@auth_bp.route('/recover-password', methods=['POST'])
def recover_password():
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({'message': 'El correo electrónico es obligatorio.'}), 400
    
    user = Usuario.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'message': 'El correo electrónico no está registrado.'}), 404
    
    horas_token = token_config['horas_expiracion']
    reset_token = str(uuid.uuid4())
    token_expiration = datetime.utcnow() + timedelta(hours=horas_token)
    
    user.reset_token = reset_token
    user.token_expiration = token_expiration
    db.session.commit()
    
    recovery_link = f"{reset_token}"
    try:
        send_email(
            recipient=user.email,
            subject="Recuperación de contraseña",
            body=f"""
            Hola {user.nombre},
            Has solicitado restablecer tu contraseña. Token válido por {horas_token} {'hora' if horas_token == 1 else 'horas'}:
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

# Endpoint para obtener todos los usuarios
@auth_bp.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    try:
        current_user_id = get_jwt_identity()
        current_user = Usuario.query.get(int(current_user_id))
        
        if not current_user or current_user.tipo.lower() != 'admin':
            return jsonify({
                'status': 403,
                'message': 'No autorizado - Se requieren permisos de administrador'
            }), 403
            
        users = Usuario.query.all()
        user_list = [{
            'id': user.id,
            'nombre': user.nombre,
            'email': user.email,
            'tipo': user.tipo
        } for user in users]
        
        return jsonify({
            'status': 200,
            'data': user_list
        }), 200
        
    except Exception as e:
        print(f"Error en get_users: {str(e)}")
        return jsonify({
            'status': 500,
            'message': f'Error del servidor: {str(e)}'
        }), 500


# Endpoint para eliminar un usuario
@auth_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = Usuario.query.get(int(current_user_id))
        
        if not current_user or current_user.tipo != 'admin':
            return jsonify({'message': 'No autorizado'}), 403

        user = Usuario.query.get(user_id)
        if not user:
            return jsonify({'message': 'Usuario no encontrado'}), 404
            
        if user.id == current_user.id:
            return jsonify({'message': 'No puede eliminarse a sí mismo'}), 400

        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'Usuario eliminado exitosamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

# Endpoint para crear un nuevo usuario (administradores o procesos autorizados)
@auth_bp.route('/api/users', methods=['POST'])
@jwt_required()
def create_user():
    current_user_id = get_jwt_identity()
    current_user = Usuario.query.get(int(current_user_id))
    
    if not current_user or current_user.tipo != 'admin':
        return jsonify({'message': 'No autorizado'}), 403

    """
    Crea un nuevo usuario en el sistema.
    Este endpoint está pensado para ser usado por administradores o procesos internos autorizados.
    """
    data = request.json
    nombre = data.get('nombre')
    email = data.get('email')
    password = data.get('password')
    tipo = data.get('tipo')

    if not all([nombre, email, password, tipo]):
        return jsonify({'message': 'Todos los campos (nombre, email, contraseña, tipo) son obligatorios.'}), 400

    # Verificar si el email ya está registrado
    existing_user = Usuario.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'message': 'El correo electrónico ya está registrado.'}), 400

    # Crear el usuario
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = Usuario(nombre=nombre, email=email, password=hashed_password, tipo=tipo)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'Usuario creado con éxito.'}), 201



# Endpoint para modificar un usuario existente
@auth_bp.route('/api/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    try:
        # Obtener el usuario actual del token
        current_user_id = get_jwt_identity()
        current_user = Usuario.query.get(int(current_user_id))
        
        if not current_user:
            return jsonify({'message': 'Usuario no encontrado'}), 404
            
        # Verificar permisos
        if current_user.tipo != 'admin' and current_user.id != user_id:
            return jsonify({'message': 'No autorizado'}), 403
            
        # Obtener el usuario a actualizar
        user_to_update = Usuario.query.get(user_id)
        if not user_to_update:
            return jsonify({'message': 'Usuario a actualizar no encontrado'}), 404
            
        data = request.json
        
        # Validar datos requeridos
        if not data:
            return jsonify({'message': 'No se proporcionaron datos para actualizar'}), 400
            
        # Actualizar campos permitidos
        if 'nombre' in data:
            user_to_update.nombre = data['nombre']
            
        if 'email' in data:
            # Verificar si el email ya existe
            existing_user = Usuario.query.filter(
                Usuario.email == data['email'],
                Usuario.id != user_id
            ).first()
            if existing_user:
                return jsonify({'message': 'El correo electrónico ya está registrado'}), 400
            user_to_update.email = data['email']
            
        if 'password' in data and data['password']:
            user_to_update.password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
            
        if 'tipo' in data and current_user.tipo == 'admin':
            user_to_update.tipo = data['tipo']
            
        db.session.commit()
        return jsonify({'message': 'Usuario actualizado exitosamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

@auth_bp.route('/check-email', methods=['POST'])
def check_email():
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({
                'status': 400,
                'message': 'Email es requerido'
            }), 400

        email = data['email']
        existing_user = Usuario.query.filter_by(email=email).first()
        
        return jsonify({
            'status': 200,
            'exists': existing_user is not None
        }), 200

    except Exception as e:
        print(f"Error al verificar email: {str(e)}")
        return jsonify({
            'status': 500,
            'message': f'Error del servidor: {str(e)}'
        }), 500

def create_token(user_id):
    try:
        # Obtener las horas de expiración del usuario admin
        admin_user = Usuario.query.filter_by(tipo='admin').first()
        horas_expiracion = admin_user.token_horas if admin_user else 24
        
        expires = timedelta(hours=horas_expiracion)
        access_token = create_access_token(
            identity=str(user_id),
            expires_delta=expires
        )
        return access_token
    except Exception as e:
        print(f"Error creating token: {str(e)}")
        # En caso de error, usar el valor predeterminado
        expires = timedelta(hours=24)
        return create_access_token(
            identity=str(user_id),
            expires_delta=expires
        )



