import { useState } from 'react';

// ローカルストレージの値とReactのStateを同期させるカスタムフック
export function useLocalStorage(key, initialValue) {
  // Stateの初期化関数。初回レンダリング時のみ実行され、ローカルストレージから既存の値を読み込む
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn("ローカルストレージの読み込みエラー:", error);
      return initialValue;
    }
  });

  // 状態とローカルストレージの双方を同時に更新する関数
  const setValue = (value) => {
    try {
      // コールバック関数による更新（prev => next の形式）もサポートするための判定
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn("ローカルストレージの保存エラー:", error);
    }
  };

  return [storedValue, setValue];
}