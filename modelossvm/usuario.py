from ..factory import db, bcrypt


class Usuario(db.Model):
    __tablename__ = 'usuario'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    reset_token = db.Column(db.String(36), nullable=True)  # Token de recuperación
    token_expiration = db.Column(db.DateTime, nullable=True)  # Fecha de expiración del token
