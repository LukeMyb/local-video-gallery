import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Player from './pages/Player';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/player/:id" element={<Player />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App