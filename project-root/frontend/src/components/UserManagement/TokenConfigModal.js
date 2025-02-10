import React from 'react';

const TokenConfigModal = ({ 
  isOpen, 
  onClose, 
  tokenHoras, 
  onTokenHorasChange, 
  onSubmit, 
  tokenError, 
  loading 
}) => {
  if (!isOpen) return null;

  const handleChange = (e) => {
    // Asegurarse de que solo se ingresen números
    const value = e.target.value.replace(/[^0-9]/g, '');
    // Simular el evento con el valor limpio
    onTokenHorasChange({ target: { value } });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Configurar Tiempo del Token</h3>
        <div className="form-group">
          <label>Duración del token (horas):</label>
          <input
            type="number"
            min="1"
            max="72"
            value={tokenHoras}
            onChange={handleChange}
            className={tokenError ? 'error' : ''}
          />
          {tokenError && <div className="input-error">{tokenError}</div>}
          <small>El valor debe estar entre 1 y 72 horas</small>
        </div>
        <div className="modal-buttons">
          <button 
            onClick={onSubmit}
            className="submit-button"
            disabled={loading || tokenError || !tokenHoras}
          >
            Actualizar
          </button>
          <button 
            onClick={onClose}
            className="cancel-button"
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenConfigModal;