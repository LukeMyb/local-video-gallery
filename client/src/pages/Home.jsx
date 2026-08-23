import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getVideos, getLibraries, getImageUrl } from '../api';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Shuffle, ArrowUp } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Sidebar } from '../components/common/Sidebar';
import { SearchBar } from '../components/home/SearchBar';

function Home() {
  const [videos, setVideos] = useState([]);
  
  const [searchQuery, setSearchQuery] = useLocalStorage('jellyfin_searchQuery', '');

  // 上に戻るボタンを直接操作するための参照
  const scrollToTopBtnRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const [isFavoriteFilter, setIsFavoriteFilter] = useLocalStorage('jellyfin_isFavorite', false);
  const [selectedLibraryId, setSelectedLibraryId] = useLocalStorage('jellyfin_libraryId', null);
  const [sortOrder, setSortOrder] = useLocalStorage('jellyfin_sortOrder', 'desc');

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [libraries, setLibraries] = useState([]);
  const [isControlBarVisible, setIsControlBarVisible] = useState(true);

  // 無限スクロール用の表示件数をsessionStorageから復元（デフォルト100）
  const [displayCount, setDisplayCount] = useState(() => {
    const saved = sessionStorage.getItem('jellyfin_displayCount');
    return saved ? parseInt(saved, 10) : 100;
  });
  const observerTarget = useRef(null); // 監視対象要素の参照

  const navigate = useNavigate(); // 画面遷移用のフック
  const location = useLocation(); // 現在のパスを監視

  // フィルターuseEffectの初回実行ブロック用フラグ
  const isFirstMountForFilter = useRef(true);
  // 復元すべきスクロール位置の保持用
  const savedScrollPosition = useRef(0);

  // サジェスト用タグリスト生成
  const allUniqueTags = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    const tagSet = new Set();
    videos.forEach(video => {
      if (video.Tags && video.Tags.length > 0) {
        // セットに追加する前に、スペースをアンダースコアに変換する
        video.Tags.forEach(tag => tagSet.add(tag.replace(/ /g, '_')));
      }
    });
    // アルファベット順などにソートしておくと見やすい
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [videos]);

  // SearchBarから受け取る検索実行ハンドラ
  const handleSearch = (newQuery) => {
    setSearchQuery(newQuery);
    setDisplayCount(100);
    sessionStorage.setItem('jellyfin_displayCount', '100');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setDisplayCount(100); // ソート変更時は初期表示に戻す
    sessionStorage.setItem('jellyfin_displayCount', '100');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // フィルター(お気に入り/ライブラリ)が切り替わった時に上に戻す
  useEffect(() => {
    // 初回マウント時は実行しないように制御
    if (isFirstMountForFilter.current) {
      isFirstMountForFilter.current = false;
      return;
    }
    setDisplayCount(100);
    sessionStorage.setItem('jellyfin_displayCount', '100');
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

  // データ取得完了後（loading === false）にスクロール位置を復元する
  useEffect(() => {
    if (!loading) {
      const saved = sessionStorage.getItem('jellyfin_scrollPosition');
      if (saved) {
        // DOMの描画が完了するのを少し待ってからスクロールを復元
        setTimeout(() => {
          window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' });
        }, 100); // 100ms程度の遅延で描画完了を待つ（必要に応じて調整）
      }
    }
  }, [loading]);

  // IntersectionObserverで最下部到達を検知
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => {
            const newCount = prev + 100;
            sessionStorage.setItem('jellyfin_displayCount', newCount.toString()); // ★追加: 表示件数増加時にも保存
            return newCount;
          });
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
    if (searchQuery.trim()) {
      const keywords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      
      filtered = filtered.filter(video => {
        const tags = video.Tags || [];
        return keywords.every(keyword => {
          const normalizedKeyword = keyword.replace(/_/g, ' ');
          return tags.some(tag => tag.toLowerCase() === normalizedKeyword);
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
  }, [videos, sortOrder, isFavoriteFilter, displayCount, searchQuery]);

  // ランダム再生ボタン押下時の処理
  const handleRandomPlay = () => {
    if (!allFiltered || allFiltered.length === 0) return;

    // プレイリスト全体をシャッフルするための関数（Fisher-Yatesアルゴリズム）
    const shuffleArray = (array) => {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };
    
    // 画面にまだ描画されていないものも含め、フィルター条件に合致する「すべての動画」からランダムに選ぶ
    const shuffledPlaylist = shuffleArray(allFiltered);
    const randomVideo = shuffledPlaylist[0];
    
    // プレイヤー画面へ遷移。同時に「シャッフル済みのリスト」を渡す
    navigate(`/player/${randomVideo.Id}`, { state: { playlist: shuffledPlaylist } });
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

  // 上に戻るボタン用のスクロール検知ロジック
  useEffect(() => {
    const handleScrollTopBtn = () => {
      if (!scrollToTopBtnRef.current) return;
      
      // 300px以上下にスクロールしたら表示、それ以外は隠す
      if (window.scrollY > 300) {
        scrollToTopBtnRef.current.style.opacity = "1";
        scrollToTopBtnRef.current.style.pointerEvents = "auto";
        scrollToTopBtnRef.current.style.transform = "translateY(0)";
      } else {
        scrollToTopBtnRef.current.style.opacity = "0";
        scrollToTopBtnRef.current.style.pointerEvents = "none";
        scrollToTopBtnRef.current.style.transform = "translateY(10px)";
      }
    };

    window.addEventListener("scroll", handleScrollTopBtn, { passive: true });
    return () => window.removeEventListener("scroll", handleScrollTopBtn);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-200 flex flex-col relative pb-24">
      {/* サイドバー */}
      <Sidebar 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        libraries={libraries}
        selectedLibraryId={selectedLibraryId}
        onSelectLibrary={setSelectedLibraryId}
      />

      {/* サーチバー */}
      <SearchBar 
        onOpenMenu={() => setIsDrawerOpen(true)}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        tags={allUniqueTags}
        isFavoriteFilter={isFavoriteFilter}
        onToggleFavorite={() => setIsFavoriteFilter(!isFavoriteFilter)}
        resultCount={allFiltered.length}
      />

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
                onClick={() => {
                  const currentScrollY = window.scrollY;
                  sessionStorage.setItem('jellyfin_scrollPosition', currentScrollY.toString());
                  sessionStorage.setItem('jellyfin_displayCount', displayCount.toString());
                }}
              >
                <img
                  src={getImageUrl(video.Id)}
                  alt={video.Name}
                  className="w-full aspect-2/3 object-cover bg-zinc-800 transition-opacity group-hover:opacity-90"
                  loading="lazy"
                />

                {/* サムネイル上のタグ表示エリア */}
                {video.Tags && video.Tags.length > 0 && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 p-1.5 bg-linear-to-t from-black/95 via-black/70 to-transparent flex flex-wrap gap-1 max-h-[20%] overflow-y-auto"
                    style={{ scrollbarWidth: 'none' }} /* スクロールバーを非表示にする */
                  >
                    {video.Tags.map(tag => (
                      <span 
                        key={tag} 
                        className="text-[9px] md:text-[10px] text-zinc-300 bg-zinc-900/80 px-1 py-0.5 rounded-sm border border-zinc-700/50 break-all"
                      >
                        {/* 表示時はスペース( )をアンダースコア(_)に変換 */}
                        {tag.replace(/ /g, '_')}
                      </span>
                    ))}
                  </div>
                )}
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

      {/* 一番上に戻るボタン */}
      <button
        ref={scrollToTopBtnRef}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-6 p-3 bg-zinc-800/50 text-white rounded-full shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-zinc-700/80 z-40 opacity-0 pointer-events-none translate-y-2 border border-zinc-700/50"
      >
        <ArrowUp size={24} />
      </button>

    </div>
  );
}

export default Home;