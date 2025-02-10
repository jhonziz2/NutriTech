import React from 'react';

const DeleteModal = ({ isOpen, onClose, onConfirm, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Confirmar Eliminación</h3>
        <p>¿Está seguro de que desea eliminar este usuario?</p>
        <div className="modal-buttons">
          <button 
            onClick={onConfirm} 
            className="confirm-button"
            disabled={loading}
          >
            Confirmar
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

export default DeleteModal; 