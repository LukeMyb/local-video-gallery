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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">動画一覧</h1>
        <input
          type="text"
          placeholder="動画を検索..."
          className="border border-gray-300 p-2 rounded-lg w-full md:w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {videos.map((video) => (
            <Link 
              to={`/player/${video.Id}`} 
              key={video.Id} 
              className="border border-gray-200 rounded-lg overflow-hidden shadow hover:shadow-lg transition block bg-white"
            >
              <img
                src={getImageUrl(video.Id)}
                alt={video.Name}
                className="w-full aspect-2/3 object-cover bg-gray-100"
                loading="lazy"
              />
              <div className="p-2">
                <p className="text-sm font-semibold truncate text-gray-800">{video.Name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;