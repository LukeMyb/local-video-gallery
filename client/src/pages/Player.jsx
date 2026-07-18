import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoStreamUrl } from '../api';

function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoUrl = getVideoStreamUrl(id);

  // 動画プレイヤーのDOM操作用参照と、状態管理
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true); // autoPlayのため初期値true
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // カスタムUIの表示状態を管理するState（初期状態は表示）
  const [showControls, setShowControls] = useState(true);

  // 再生・一時停止の切り替え処理
  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  // シークバー操作時の処理
  const handleSeek = (e) => {
    const time = Number(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // 秒数を MM:SS 形式に変換する補助関数
  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

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

      {/* Videoプレイヤー */}
      <div className="w-full max-w-5xl bg-black shadow-lg rounded-lg overflow-hidden border border-gray-800 relative">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          className="w-full aspect-video cursor-pointer"
          src={videoUrl}
          /* onClickの挙動をトグル再生から、UI表示の切り替えに変更 */
          onClick={() => setShowControls(!showControls)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
          onLoadedMetadata={() => setDuration(videoRef.current.duration)}
        >
          お使いのブラウザは動画の再生をサポートしていません。
        </video>

        {/* カスタムコントロールUI */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          
          {/* シークバーエリア */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-white text-sm font-mono">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-white text-sm font-mono">{formatTime(duration)}</span>
          </div>

          {/* ボタンエリア */}
          <div className="flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="text-white bg-gray-700 hover:bg-gray-600 rounded-full w-12 h-12 flex items-center justify-center text-xl transition"
            >
              {isPlaying ? '⏸' : '▶️'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Player;