import { Sidebar } from '../components/common/Sidebar';
import { SearchBar } from '../components/home/SearchBar';
import { VideoGrid } from '../components/home/VideoGrid';
import { ControlBar } from '../components/home/ControlBar';
import { useVideos } from '../hooks/useVideos';
import { useSwipe } from '../hooks/useSwipe';

function Home() {
  const {
    loading,
    libraries,
    selectedLibraryId,
    setSelectedLibraryId,
    isDrawerOpen,
    setIsDrawerOpen,
    searchQuery,
    handleSearch,
    allUniqueTags,
    isFavoriteFilter,
    setIsFavoriteFilter,
    allFiltered,
    displayed,
    handleLoadMore,
    handleVideoClick,
    isControlBarVisible,
    sortOrder,
    toggleSortOrder,
    handleRandomPlay,
    scrollToTopBtnRef
  } = useVideos();

  // 右スワイプ時にサイドバー(Drawer)を開く処理を設定
  const swipeHandlers = useSwipe({
    onSwipeRight: () => setIsDrawerOpen(true)
  });

  return (
    <div 
      className="min-h-screen bg-zinc-900 text-zinc-200 flex flex-col relative pb-24"
      {...swipeHandlers}
    >
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