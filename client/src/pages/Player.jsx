import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoStreamUrl } from '../api';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Rewind,
  FastForward,
  Maximize, 
  Minimize 
} from 'lucide-react';

function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoUrl = getVideoStreamUrl(id);

  // 動画プレイヤーのDOM操作用参照と、状態管理
  const videoRef = useRef(null);
  const containerRef = useRef(null); // フルスクリーン化する親要素の参照

  /* モバイル(スマホ・タブレット)判定 */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const isFullscreen = isNativeFullscreen;

  const [isPlaying, setIsPlaying] = useState(true); // autoPlayのため初期値true
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
    // ネイティブフルスクリーンAPIの呼び出し
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
  };


  // 再生・一時停止の切り替え処理
  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  // 10秒巻き戻し / 先送り処理
  const skipBackward = () => {
    if (videoRef.current) {
      const newTime = Math.max(0, videoRef.current.currentTime - 10);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  const skipForward = () => {
    if (videoRef.current) {
      const newTime = Math.min(duration, videoRef.current.currentTime + 10);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
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
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-50 w-full h-100dvh bg-black flex flex-col justify-center"
    >
      {/* 上部コントロールバー（戻るボタンなど） */}
      <div 
        className={`absolute top-0 left-0 right-0 px-8 portrait:px-4 pb-6 pt-6 portrait:pt-16 landscape:pt-6 bg-linear-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 z-10 flex items-center gap-4 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button 
          onClick={() => navigate('/')}
          className="px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-full transition-colors flex items-center justify-center"
          title="一覧へ戻る"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Videoプレイヤー */}
      <video 
        ref={videoRef}
        autoPlay 
        playsInline
        /* 常にコンテナいっぱいに広げ、アスペクト比を維持して黒帯を入れる(object-contain) */
        className="w-full h-full object-contain cursor-pointer bg-black"
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
        className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent px-8 py-6 transition-opacity duration-300 z-10 ${
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
            className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
          />
          <span className="text-white text-sm font-mono">{formatTime(duration)}</span>
        </div>

        {/* ボタンエリア */}
        <div className="flex items-center justify-between mt-2">

          {/* 中央の再生コントロール群 */}
          <div className="flex items-center gap-6 sm:gap-8">
            
            {/* 10秒戻る */}
            <button
              onClick={skipBackward}
              className="text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
              title="10秒戻る"
            >
              <Rewind size={28} className="fill-current" strokeWidth={0} />
            </button>

            {/* 再生/一時停止 */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-blue-400 flex items-center justify-center transition-colors"
              title={isPlaying ? "一時停止" : "再生"}
            >
              {isPlaying ? <Pause size={28} className="fill-current"  strokeWidth={0} /> : <Play size={28} className="fill-current ml-1" strokeWidth={0} />}
            </button>

            {/* 10秒進む */}
            <button
              onClick={skipForward}
              className="text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
              title="10秒進む"
            >
              <FastForward size={28} className="fill-current" strokeWidth={0} />
            </button>

            {/* 前の動画（ダミー） */}
            <button
              onClick={() => {}}
              className="text-zinc-500 cursor-not-allowed flex items-center justify-center transition-colors"
              title="前の動画 (未実装)"
            >
              <SkipBack size={24} className="fill-current" />
            </button>

            {/* 次の動画（ダミー） */}
            <button
              onClick={() => {}}
              className="text-zinc-500 cursor-not-allowed flex items-center justify-center transition-colors"
              title="次の動画 (未実装)"
            >
              <SkipForward size={24} className="fill-current" />
            </button>
          </div>

          {/* 右側のコントロール群 */}
          <div className="w-12 flex justify-end">
            {!isMobile && (
              <button
                onClick={toggleFullscreen}
                className="text-zinc-300 hover:text-white transition-colors"
                title={isFullscreen ? "フルスクリーン解除" : "フルスクリーン"}
              >
                {isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Player;