import React from 'react';

const UserTable = ({ 
  filteredUsers, 
  handleEditClick, 
  confirmDeleteUser, 
  loading,
  handleSort,
  sortDirection 
}) => {
  return (
    <div className="user-table-container">
      <table className="user-table">
        <thead>
          <tr>
            <th onClick={handleSort} style={{ cursor: 'pointer' }}>
              ID {sortDirection === 'asc' ? '↑' : '↓'}
            </th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Tipo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.nombre}</td>
              <td>{user.email}</td>
              <td>{user.tipo}</td>
              <td>
                <button
                  onClick={() => handleEditClick(user)}
                  className="edit-button"
                  disabled={loading}
                >
                  Editar
                </button>
                <button
                  onClick={() => confirmDeleteUser(user.id)}
                  className="delete-button"
                  disabled={loading}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable; 