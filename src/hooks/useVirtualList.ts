import { useCallback, useEffect, useRef, useState } from 'react';

interface VirtualListOptions {
  itemHeight: number;
  overscan?: number;
  containerHeight: number;
}

export const useVirtualList = <T>(
  items: T[],
  { itemHeight, overscan = 3, containerHeight }: VirtualListOptions
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleItemCount = Math.ceil(containerHeight / itemHeight);
  const totalHeight = items.length * itemHeight;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  const getItemStyle = useCallback((index: number) => ({
    position: 'absolute' as const,
    top: `${index * itemHeight}px`,
    width: '100%',
    height: `${itemHeight}px`,
  }), [itemHeight]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    requestAnimationFrame(() => {
      setScrollTop(e.currentTarget.scrollTop);
    });
  }, []);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    startIndex,
    getItemStyle,
    onScroll
  };
};