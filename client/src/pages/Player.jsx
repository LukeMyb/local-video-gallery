import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoStreamUrl } from '../api';

function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoUrl = getVideoStreamUrl(id);

  // 動画プレイヤーのDOM操作用参照と、状態管理
  const videoRef = useRef(null);
  const containerRef = useRef(null); // フルスクリーン化する親要素の参照

  // フルスクリーンの状態管理を2種類に分割
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false); // PC/Android等
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false); // iOS等(CSS制御)
  const isFullscreen = isNativeFullscreen || isPseudoFullscreen;

  const [isPlaying, setIsPlaying] = useState(true); // autoPlayのため初期値true
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // カスタムUIの表示状態を管理するState（初期状態は表示）
  const [showControls, setShowControls] = useState(true);


  // フルスクリーン状態の変更を検知する副作用（ESCキーでの解除なども検知）
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari対応

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // フルスクリーン切り替え処理
  const toggleFullscreen = () => {
    const container = containerRef.current;
    // フルスクリーンAPIが存在するか（iPhone以外か）を判定
    const canNativeFullscreen = container.requestFullscreen || container.webkitRequestFullscreen;

    if (canNativeFullscreen) {
      // 標準機能が使える環境 (PC / Android)
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } else {
      // 標準機能が使えない環境 (iPhone Safari等) はCSSによる切り替え
      setIsPseudoFullscreen(!isPseudoFullscreen);
    }
  };


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
      {/* フルスクリーン時は戻るボタンを非表示にする（レイアウト崩れ防止） */}
      <div className={`w-full max-w-5xl mb-4 ${isFullscreen ? 'hidden' : 'block'}`}>
        <button 
          onClick={() => navigate('/')}
          className="text-white bg-gray-800 px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          ← 一覧へ戻る
        </button>
      </div>

      {/* Videoプレイヤー */}
      <div 
        ref={containerRef} 
        className={
          isPseudoFullscreen 
            ? "fixed inset-0 z-50 w-full h-100dvh bg-black flex flex-col justify-center" 
            : `w-full max-w-5xl bg-black shadow-lg rounded-lg overflow-hidden border border-gray-800 relative flex flex-col justify-center ${isNativeFullscreen ? 'h-screen' : ''}`
        }
      >
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          /* フルスクリーン時は高さを画面に合わせて黒帯を入れる(object-contain) */
          className={`w-full cursor-pointer bg-black ${isFullscreen ? 'h-full object-contain' : 'aspect-video'}`}
          src={videoUrl}
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
          className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
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
          <div className="flex items-center justify-between">
            <div className="w-12"></div> {/* 中央揃えのための見えないスペーサー */}
            
            <button
              onClick={togglePlay}
              className="text-white bg-gray-700 hover:bg-gray-600 rounded-full w-12 h-12 flex items-center justify-center text-xl transition"
            >
              {isPlaying ? '⏸' : '▶️'}
            </button>

            <button
              onClick={toggleFullscreen}
              className="text-white bg-gray-700 hover:bg-gray-600 rounded px-3 py-2 text-sm flex items-center justify-center transition"
            >
              {isFullscreen ? '縮小' : '全画面'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Player;