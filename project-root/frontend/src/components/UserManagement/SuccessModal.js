import React from 'react';

const SuccessModal = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content success-modal">
        <div className="success-icon">✓</div>
        <h3>{message}</h3>
        <button 
          onClick={onClose}
          className="submit-button"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;
