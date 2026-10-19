import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

export const FLOATING_TAB_BAR_HEIGHT = 64;
export const FLOATING_TAB_BAR_BOTTOM_SPACING = 10;
export const FLOATING_TAB_BAR_CONTENT_PADDING =
  FLOATING_TAB_BAR_HEIGHT + FLOATING_TAB_BAR_BOTTOM_SPACING + 20;

// Let the Feed scroll noticeably before the top header rolls away.
const HEADER_HIDE_SCROLL_THRESHOLD = 140;

type TabBarScrollContextValue = {
  compact: boolean;
  headerHidden: boolean;
  onFeedScroll: (offsetY: number) => void;
  expand: () => void;
};

const TabBarScrollContext =
  createContext<TabBarScrollContextValue | null>(null);

export function TabBarScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [compact, setCompact] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastOffset = useRef(0);

  const onFeedScroll = useCallback((offsetY: number) => {
    const y = Math.max(0, offsetY);
    const delta = y - lastOffset.current;

    if (y < 40) {
      setCompact(false);
      setHeaderHidden(false);
    } else if (delta >= 7) {
      if (y > 70) setCompact(true);
      if (y > HEADER_HIDE_SCROLL_THRESHOLD) setHeaderHidden(true);
    } else if (delta <= -7) {
      setCompact(false);
      setHeaderHidden(false);
    }

    // Small onScroll changes accumulate instead of causing flicker.
    if (Math.abs(delta) >= 7 || y < 40) {
      lastOffset.current = y;
    }
  }, []);

  const expand = useCallback(() => {
    setCompact(false);
    setHeaderHidden(false);
    lastOffset.current = 0;
  }, []);

  const value = useMemo(
    () => ({ compact, headerHidden, onFeedScroll, expand }),
    [compact, headerHidden, onFeedScroll, expand]
  );

  return (
    <TabBarScrollContext.Provider value={value}>
      {children}
    </TabBarScrollContext.Provider>
  );
}

export function useTabBarScroll() {
  const context = useContext(TabBarScrollContext);

  if (!context) {
    throw new Error(
      'useTabBarScroll must be used inside TabBarScrollProvider'
    );
  }

  return context;
}
