import { useState } from 'react'

// 接続情報
const JELLYFIN_URL = "http://localhost:8096"; 
const API_KEY = "YOUR_API_KEY";
const TEST_VIDEO_ID = "b010a411eef74bcef0b5868532ccea7c";

function App() {
  const videoUrl = `${JELLYFIN_URL}/Videos/${TEST_VIDEO_ID}/stream?api_key=${API_KEY}`;

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Jellyfin ストリーミングテスト</h2>
      <p>動画ID: {TEST_VIDEO_ID}</p>
      
      <div style={{ marginTop: "20px", padding: "10px", background: "#f0f0f0", display: "inline-block" }}>
        <video 
          controls 
          width="800" 
          src={videoUrl}
          onError={(e) => console.error("動画の読み込みエラー:", e)}
        >
          お使いのブラウザは動画タグをサポートしていません。
        </video>
      </div>
      <p style={{ marginTop: "10px", fontSize: "0.9em", color: "#666" }}>
        ※再生ボタンを押してもエラーになる場合、F12キーでブラウザの開発者ツールを開き、<br />
        Consoleタブに「CORS policy」に関するエラーが出ていないか確認してください。
      </p>
    </div>
  )
}

export default App