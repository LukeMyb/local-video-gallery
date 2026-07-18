import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Player from './pages/Player';

// 接続情報
const JELLYFIN_URL = "http://localhost:8096"; 
const API_KEY = "053bd9021a7c4c41b60f937454f1200a";
const TEST_VIDEO_ID = "b010a411eef74bcef0b5868532ccea7c";

function App() {
  const videoUrl = `${JELLYFIN_URL}/Videos/${TEST_VIDEO_ID}/stream?api_key=${API_KEY}`;

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