import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVideos, getLibraries, getImageUrl } from '../api';
import { Menu, Search as SearchIcon, Heart, ArrowDownWideNarrow, ArrowUpNarrowWide, Shuffle, X, Folder } from 'lucide-react';

// ローカルストレージと同期するカスタムフック
function useLocalStorage(key, initialValue) {
  // 初期値の取得時に一度だけローカルストレージを確認する
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn("ローカルストレージの読み込みエラー:", error);
      return initialValue;
    }
  });

  // 値を更新する関数（Stateを更新しつつ、ローカルストレージにも保存）
  const setValue = (value) => {
    try {
      // useStateと同じように関数での更新もサポート
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn("ローカルストレージの保存エラー:", error);
    }
  };

  return [storedValue, setValue];
}

function Home() {
  const [videos, setVideos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [isFavoriteFilter, setIsFavoriteFilter] = useLocalStorage('jellyfin_isFavorite', false);
  const [selectedLibraryId, setSelectedLibraryId] = useLocalStorage('jellyfin_libraryId', null);
  const [sortOrder, setSortOrder] = useLocalStorage('jellyfin_sortOrder', 'desc');

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [libraries, setLibraries] = useState([]);
  const [isControlBarVisible, setIsControlBarVisible] = useState(true);

  // 無限スクロール用の表示件数管理
  const [displayCount, setDisplayCount] = useState(100);
  const observerTarget = useRef(null); // 監視対象要素の参照

  const navigate = useNavigate(); //画面遷移用のフック

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setDisplayCount(100); // ソート変更時は初期表示に戻す
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // フィルター(お気に入り/ライブラリ)が切り替わった時に上に戻す
  useEffect(() => {
    setDisplayCount(100);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isFavoriteFilter, selectedLibraryId]);

  // 初回マウント時にライブラリ一覧を取得
  useEffect(() => {
    const fetchLibs = async () => {
      try {
        const data = await getLibraries();
        setLibraries(data.Items || []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchLibs();
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const data = await getVideos(selectedLibraryId);
        setVideos(data.Items || []);
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };

    fetchVideos();
  }, [selectedLibraryId]);

  // IntersectionObserverで最下部到達を検知
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => prev + 100);
        }
      },
      { rootMargin: '400px' } // 下端に近づいたら早めに読み込む
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, []);

  // ソート順(sortOrder)に応じて表示する動画リストを並び替える処理
  const { allFiltered, displayed } = useMemo(() => {
    if (!videos) return { allFiltered: [], displayed: [] };
    
    let filtered = [...videos];
    
    if (isFavoriteFilter) {
      filtered = filtered.filter(video => video.UserData?.IsFavorite);
    }

    // タグ検索フィルターのロジック
    if (search.trim()) {
      // filter(Boolean) で連続したスペースによる空文字を除外
      const keywords = search.toLowerCase().split(/\s+/).filter(Boolean);
      
      filtered = filtered.filter(video => {
        // APIから取得したタグ情報の配列。ない場合は空配列として扱う
        const tags = video.Tags || [];
        
        // 入力されたすべてのキーワードが、いずれかのタグに部分一致するか判定
        return keywords.every(keyword => {
          const normalizedKeyword = keyword.replace(/_/g, ' ');
          return tags.some(tag => tag.toLowerCase().includes(normalizedKeyword));
        });
      });
    }

    // ソートの適用
    filtered.sort((a, b) => {
      const dateA = new Date(a.DateCreated || 0).getTime();
      const dateB = new Date(b.DateCreated || 0).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    // 表示件数分だけ切り出す
    return {
      allFiltered: filtered,
      displayed: filtered.slice(0, displayCount)
    };
  }, [videos, sortOrder, isFavoriteFilter, displayCount, search]);

  // ランダム再生ボタン押下時の処理
  const handleRandomPlay = () => {
    if (!allFiltered || allFiltered.length === 0) return;
    
    // 画面にまだ描画されていないものも含め、フィルター条件に合致する「すべての動画」からランダムに選ぶ
    const randomIndex = Math.floor(Math.random() * allFiltered.length);
    const randomVideo = allFiltered[randomIndex];
    
    // プレイヤー画面へ遷移。同時に現在のリスト情報(allFiltered)を渡す
    navigate(`/player/${randomVideo.Id}`, { state: { playlist: allFiltered } });
  };

  // スクロール方向を検知してコントロールバーの表示/非表示を切り替える処理
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false; // 処理の重複実行を防ぐためのフラグ

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY < lastScrollY) {
            // 上にスクロールした場合は表示
            setIsControlBarVisible(true);
          } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
            // 下にスクロールした場合は非表示 (上部の遊びを考慮して50px以上のスクロールで判定)
            setIsControlBarVisible(false);
          }
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-200 flex flex-col relative pb-24">
      {/* ★追加: ドロワーのオーバーレイ背景（クリックで閉じる） */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 transition-opacity backdrop-blur-sm"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* ★追加: サイドドロワー本体 */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-100">ライブラリ</h2>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 text-zinc-400 hover:text-white rounded-md transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {/* 「すべての動画」選択ボタン */}
          <button
            onClick={() => {
              setSelectedLibraryId(null);
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
              selectedLibraryId === null ? 'bg-zinc-800 text-blue-400 border-r-2 border-blue-400' : 'text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <Folder size={20} className={selectedLibraryId === null ? 'fill-blue-900/50' : ''} />
            <span className="font-medium">すべての動画</span>
          </button>
          
          {/* 取得したライブラリ一覧の描画 */}
          {libraries.map(lib => (
            <button
              key={lib.Id}
              onClick={() => {
                setSelectedLibraryId(lib.Id);
                setIsDrawerOpen(false);
              }}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                selectedLibraryId === lib.Id ? 'bg-zinc-800 text-blue-400 border-r-2 border-blue-400' : 'text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <Folder size={20} className={selectedLibraryId === lib.Id ? 'fill-blue-900/50' : ''} />
              <span className="font-medium">{lib.Name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ヘッダーおよびステータス表示エリア */}
      <div className="p-3 portrait:pt-16 md:p-4 md:portrait:pt-4 md:sticky md:top-0 md:z-40 md:bg-zinc-900/90 md:backdrop-blur-md md:border-b md:border-zinc-800 flex flex-col gap-3">
        
        {/* 上段: 操作パネル */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* ドロワーボタン */}
          <button 
            onClick={() => setIsDrawerOpen(true)}
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
            <span className="ml-2 text-zinc-200 font-medium">{allFiltered.length}件</span>
          </p>
        </div>
      </div>

      <div className="p-2 md:p-4 pt-0 flex-1 flex flex-col gap-4 w-full">
        {loading ? (
          <p className="text-zinc-500 text-center mt-8 text-sm">読み込み中...</p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 landscape:grid-cols-6 gap-2 lg:gap-4">
            {displayed.map((video) => (
              <Link 
                to={`/player/${video.Id}`}
                state={{ playlist: allFiltered }}
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

        {/* 無限スクロールの検知ポイント */}
        <div ref={observerTarget} className="h-20" />
      </div>
      
      {/* ピル型のフローティングコントロールバー */}
      <div 
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-in-out ${
          isControlBarVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
        }`}
      >
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
            onClick={handleRandomPlay}
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