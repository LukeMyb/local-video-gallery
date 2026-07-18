import { useParams, useNavigate } from 'react-router-dom';
import { getVideoStreamUrl } from '../api';

function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // APIファイルで作成した関数を使って再生用URLを取得
  const videoUrl = getVideoStreamUrl(id);

  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center p-4">
      {/* 戻るボタン */}
      <div className="w-full max-w-5xl mb-4">
        <button 
          onClick={() => navigate('/')}
          className="text-white bg-gray-800 px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          ← 一覧へ戻る
        </button>
      </div>

      {/* 標準のVideoプレイヤー */}
      <div className="w-full max-w-5xl bg-black shadow-lg rounded-lg overflow-hidden border border-gray-800">
        <video 
          controls 
          autoPlay 
          className="w-full aspect-video"
          src={videoUrl}
        >
          お使いのブラウザは動画の再生をサポートしていません。
        </video>
      </div>
    </div>
  );
}

export default Player;