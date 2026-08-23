import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getVideos, getLibraries } from '../api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Sidebar } from '../components/common/Sidebar';
import { SearchBar } from '../components/home/SearchBar';
import { VideoGrid } from '../components/home/VideoGrid';
import { ControlBar } from '../components/home/ControlBar';

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
        // 即座にスクロールを実行
        window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' });
        
        // 復元後は不要になるため、セッションストレージから削除して誤動作を防ぐ
        sessionStorage.removeItem('jellyfin_scrollPosition');
      }
    }
  }, [loading]);

  // もっと読み込む（無限スクロール）ハンドラ
  const handleLoadMore = useCallback(() => {
    setDisplayCount((prev) => {
      const newCount = prev + 100;
      sessionStorage.setItem('jellyfin_displayCount', newCount.toString());
      return newCount;
    });
  }, []);

  // 動画クリック時にスクロール位置を保存するハンドラ
  const handleVideoClick = useCallback(() => {
    const currentScrollY = window.scrollY;
    sessionStorage.setItem('jellyfin_scrollPosition', currentScrollY.toString());
    sessionStorage.setItem('jellyfin_displayCount', displayCount.toString());
  }, [displayCount]);

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
      {/* SideBar */}
      <Sidebar 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        libraries={libraries}
        selectedLibraryId={selectedLibraryId}
        onSelectLibrary={setSelectedLibraryId}
      />

      {/* SearchBar */}
      <SearchBar 
        onOpenMenu={() => setIsDrawerOpen(true)}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        tags={allUniqueTags}
        isFavoriteFilter={isFavoriteFilter}
        onToggleFavorite={() => setIsFavoriteFilter(!isFavoriteFilter)}
        resultCount={allFiltered.length}
      />

      {/* VideoGrid */}
      <VideoGrid 
        loading={loading}
        displayedVideos={displayed}
        allFilteredVideos={allFiltered}
        onLoadMore={handleLoadMore}
        onVideoClick={handleVideoClick}
      />
      
      {/* ControlBar */}
      <ControlBar 
        isControlBarVisible={isControlBarVisible}
        sortOrder={sortOrder}
        onToggleSortOrder={toggleSortOrder}
        onRandomPlay={handleRandomPlay}
        scrollToTopBtnRef={scrollToTopBtnRef}
        onScrollToTop={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />

    </div>
  );
}

export default Home;