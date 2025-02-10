import React from 'react';

const SearchBar = ({ 
  searchType, 
  setSearchType, 
  searchTerm, 
  setSearchTerm, 
  loading 
}) => {
  return (
    <div className="search-section">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={`Buscar ${searchType === 'nombre' ? 'por nombre...' : 'por ID...'}`}
        className="search-input"
        disabled={loading}
      />
      <select
        value={searchType}
        onChange={(e) => setSearchType(e.target.value)}
        className="search-type-select"
        disabled={loading}
      >
        <option value="nombre">Por Nombre</option>
        <option value="id">Por ID</option>
      </select>
    </div>
  );
};

export default SearchBar; 