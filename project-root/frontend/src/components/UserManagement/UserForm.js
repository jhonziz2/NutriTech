import React from 'react';

const UserForm = ({ 
  user, 
  onChange, 
  onSubmit, 
  onCancel, 
  passwordTips, 
  emailError, 
  loading, 
  isEditing 
}) => {
  return (
    <form onSubmit={onSubmit} className="user-form">
      <div className="form-group">
        <label>Nombre:</label>
        <input
          type="text"
          name="nombre"
          value={user.nombre}
          onChange={onChange}
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Email:</label>
        <input
          type="email"
          name="email"
          value={user.email}
          onChange={onChange}
          required
          disabled={loading}
          className={emailError ? 'error' : ''}
        />
        {emailError && <div className="input-error">{emailError}</div>}
      </div>

      <div className="form-group">
        <label>Contraseña:{isEditing && ' (Dejar en blanco para mantener)'}</label>
        <input
          type="password"
          name="password"
          value={user.password}
          onChange={onChange}
          required={!isEditing}
        />
        {passwordTips.length > 0 && (
          <div className="password-tips">
            <ul>
              {passwordTips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Tipo:</label>
        <select
          name="tipo"
          value={user.tipo}
          onChange={onChange}
          required
        >
          <option value="">Seleccionar tipo</option>
          <option value="admin">Administrador</option>
          <option value="usuario">Usuario</option>
        </select>
      </div>

      <div className="form-buttons">
        <button 
          type="submit" 
          className="submit-button"
          disabled={loading}
        >
          {isEditing ? 'Actualizar' : 'Crear'}
        </button>
        <button 
          type="button" 
          onClick={onCancel}
          className="cancel-button"
          disabled={loading}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default UserForm; 