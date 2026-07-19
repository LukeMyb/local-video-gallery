import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getVideos, getImageUrl } from '../api';
import { Menu, Search as SearchIcon, Heart, ArrowDownWideNarrow, ArrowUpNarrowWide, Shuffle } from 'lucide-react';

function Home() {
  const [videos, setVideos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFavoriteFilter, setIsFavoriteFilter] = useState(false);

  const [sortOrder, setSortOrder] = useState('desc');
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const data = await getVideos(search);
        setVideos(data.Items || []);
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };

    // 検索入力が少し落ち着いてからAPIを叩くための遅延処理
    const timer = setTimeout(() => fetchVideos(), 500);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-200 flex flex-col relative pb-24">

      {/* ヘッダーおよびステータス表示エリア */}
      <div className="p-3 portrait:pt-16 md:p-4 md:portrait:pt-4 md:sticky md:top-0 md:z-40 md:bg-zinc-900/90 md:backdrop-blur-md md:border-b md:border-zinc-800 flex flex-col gap-3">
        
        {/* 上段: 操作パネル */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* ドロワーボタン */}
          <button 
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
            title="メニューを開く"
          >
            <Menu size={24} />
          </button>

          {/* 検索窓 */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="タグで動画を検索..."
              className="w-full p-2.5 bg-[#27272a] rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* 虫眼鏡ボタン */}
          <button 
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
            title="検索する"
          >
            <SearchIcon size={24} />
          </button>

          {/* お気に入りボタン */}
          <button 
            onClick={() => setIsFavoriteFilter(!isFavoriteFilter)}
            className={`p-2 rounded-md transition-colors ${
              isFavoriteFilter 
                ? 'text-white hover:bg-zinc-800'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="お気に入りのみ表示"
          >
            <Heart size={24} className={isFavoriteFilter ? 'fill-current' : ''} />
          </button>
        </div>

        {/* 下段: ステータスメッセージ */}
        <div className="px-2 flex items-center justify-between text-sm">
          <p className="text-zinc-400">
            {search || isFavoriteFilter ? '絞り込み結果' : 'すべての動画'}
            <span className="ml-2 text-zinc-200 font-medium">{videos.length}件</span>
          </p>
        </div>
      </div>

      <div className="p-2 md:p-4 pt-0 flex-1 flex flex-col gap-4 w-full">
        {loading ? (
          <p className="text-zinc-500 text-center mt-8 text-sm">読み込み中...</p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 landscape:grid-cols-6 gap-2 lg:gap-4">
            {videos.map((video) => (
              <Link 
                to={`/player/${video.Id}`} 
                key={video.Id} 
                className="relative rounded-md overflow-hidden bg-[#27272a] border border-zinc-800 hover:bg-zinc-700 transition-colors block group"
              >
                <img
                  src={getImageUrl(video.Id)}
                  alt={video.Name}
                  className="w-full aspect-2/3 object-cover bg-zinc-800 transition-opacity group-hover:opacity-90"
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* ピル型のフローティングコントロールバー */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-in-out">
        <div className="bg-zinc-800/90 backdrop-blur-md border border-zinc-700 shadow-2xl rounded-full px-1.5 py-1.5 flex flex-row items-center gap-1 overflow-x-auto max-w-[95vw] scrollbar-hide">
          
          {/* ソート順変更トグルボタン */}
          <button
            onClick={toggleSortOrder}
            className="flex flex-row items-center gap-2 px-4 py-2 rounded-full hover:bg-zinc-700 transition-colors text-zinc-300"
          >
            {sortOrder === 'desc' ? <ArrowDownWideNarrow size={18} /> : <ArrowUpNarrowWide size={18} />}
            <span className="text-sm font-medium whitespace-nowrap">
              {sortOrder === 'desc' ? '新しい順' : '古い順'}
            </span>
          </button>

          <div className="w-px h-5 bg-zinc-700 mx-1 shrink-0"></div>

          {/* ランダム再生ボタン */}
          <button
            className="flex flex-row items-center gap-2 px-4 py-2 rounded-full hover:bg-zinc-700 transition-colors text-blue-400"
          >
            <Shuffle size={18} />
            <span className="text-sm font-medium whitespace-nowrap">ランダム再生</span>
          </button>
          
        </div>
      </div>

    </div>
  );
}

export default Home;