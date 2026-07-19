const API_URL = import.meta.env.VITE_JELLYFIN_URL;
const API_KEY = import.meta.env.VITE_JELLYFIN_API_KEY;
const USER_ID = import.meta.env.VITE_JELLYFIN_USER_ID;

export const getVideos = async (searchTerm = '') => {
  const url = new URL(`${API_URL}/Items`);
  // APIキーをクエリパラメータとして付与
  url.searchParams.append('api_key', API_KEY);
  // 動画ファイルのみを取得対象とする
  url.searchParams.append('IncludeItemTypes', 'Movie,Episode,Video');
  // フォルダ階層を無視してすべてのアイテムをフラットに取得する
  url.searchParams.append('Recursive', 'true');
  // ソート用にDateCreated(追加日時)を取得する
  url.searchParams.append('Fields', 'DateCreated');

  // ユーザーIDをパラメータに付与して、お気に入りデータ等を含める
  if (USER_ID) {
    url.searchParams.append('userId', USER_ID);
  }
  
  if (searchTerm) {
    url.searchParams.append('searchTerm', searchTerm);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error('動画の取得に失敗しました');
  }

  const data = await res.json();
    
  // デバッグ用にお気に入りステータスが取得できているか確認
  if (data.Items && data.Items.length > 0) {
    console.log('UserData(お気に入り等)の取得確認:', data.Items[0].UserData);
  }

  return data;
};

export const getImageUrl = (itemId) => {
  // サムネイル画像用のURLを構築
  return `${API_URL}/Items/${itemId}/Images/Primary?fillHeight=300&fillWidth=200&quality=90`;
};

export const getVideoStreamUrl = (itemId) => {
  // static=true を付与してDirect Play（静的ファイル配信）を強制する
  return `${API_URL}/Videos/${itemId}/stream?api_key=${API_KEY}&static=true`;
};