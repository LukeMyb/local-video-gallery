const API_URL = import.meta.env.VITE_JELLYFIN_URL;
const API_KEY = import.meta.env.VITE_JELLYFIN_API_KEY;

export const getVideos = async (searchTerm = '') => {
  const url = new URL(`${API_URL}/Items`);
  // APIキーをクエリパラメータとして付与
  url.searchParams.append('api_key', API_KEY);
  // 動画ファイルのみを取得対象とする
  url.searchParams.append('IncludeItemTypes', 'Movie,Episode,Video');
  // フォルダ階層を無視してすべてのアイテムをフラットに取得する
  url.searchParams.append('Recursive', 'true');
  
  if (searchTerm) {
    url.searchParams.append('searchTerm', searchTerm);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error('動画の取得に失敗しました');
  }
  return await res.json();
};

export const getImageUrl = (itemId) => {
  // サムネイル画像用のURLを構築
  return `${API_URL}/Items/${itemId}/Images/Primary?fillHeight=300&fillWidth=200&quality=90`;
};