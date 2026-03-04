import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <div>
        <main>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>
      </div>  
    </Router>
  );
}

export default App;
