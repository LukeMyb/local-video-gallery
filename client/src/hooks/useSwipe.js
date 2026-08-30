import { useState } from 'react';

export function useSwipe({ onSwipeRight }) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // スワイプと判定する最小の移動距離（ピクセル）
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null); // 前回の終了座標をリセット
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchEnd.x - touchStart.x;
    const distanceY = touchEnd.y - touchStart.y;
    
    const isRightSwipe = distanceX > minSwipeDistance;
    // 誤動作を防ぐため、縦方向より横方向の移動距離が大きい場合のみスワイプと判定
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isRightSwipe && isHorizontalSwipe) {
      if (onSwipeRight) onSwipeRight();
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
}