import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getVideos, getImageUrl } from '../api';

function Home() {
  const [videos, setVideos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-zinc-900 text-zinc-200 flex flex-col relative pb-20">
      
      <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 md:sticky md:top-0 md:z-40 md:bg-zinc-900/90 md:backdrop-blur-md md:border-b md:border-zinc-800">
        <h1 className="text-xl font-bold text-white">動画一覧</h1>
        <input
          type="text"
          placeholder="動画を検索..."
          className="p-3 bg-[#27272a] rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600 w-full md:w-1/3 min-w-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="p-2 md:p-4 pt-4 flex-1 flex flex-col gap-4 max-w-7xl mx-auto w-full">
        {loading ? (
          <p className="text-zinc-500 text-center mt-8 text-sm">読み込み中...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
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
                <div className="p-2">
                  <p className="text-sm font-medium text-zinc-300 group-hover:text-white truncate transition-colors">
                    {video.Name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;