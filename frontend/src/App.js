import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from './pages/Login';
import Recommendations from "./components/Recommendations";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        
        <Route path="/recommendations" element={<Recommendations />} />
        {/* Agrega más rutas aquí */}
      </Routes>
    </Router>
  );
}

export default App;
