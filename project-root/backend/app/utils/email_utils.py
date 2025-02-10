import smtplib
from email.mime.text import MIMEText

def send_email(recipient, subject, body):
    """
    Envía un correo electrónico a través del servidor SMTP de Gmail.
    
    Args:
        recipient (str): Dirección de correo electrónico del destinatario.
        subject (str): Asunto del correo electrónico.
        body (str): Cuerpo del correo electrónico.
    
    Raises:
        Exception: Si hay un error al enviar el correo.
    """
    # Configuración del remitente y credenciales
    sender = 'primepruebaecu@gmail.com'
    password = 'pkwm pjvf qmue imsj'

    # Crear el mensaje
    msg = MIMEText(body, 'plain', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = recipient

    try:
        # Conexión al servidor SMTP
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()  # Habilitar cifrado TLS
            server.login(sender, password)  # Iniciar sesión
            server.send_message(msg)  # Enviar mensaje
    except Exception as e:
        raise Exception(f"Error al enviar el correo: {e}")
