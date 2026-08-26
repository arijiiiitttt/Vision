import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Open Routes
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
     
          {/* Open Links */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

      
      </Routes>
    </BrowserRouter>
  );
}
