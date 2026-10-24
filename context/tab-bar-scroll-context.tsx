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
const HEADER_HIDE_SCROLL_THRESHOLD = 6;

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

    // Begin rolling the entire overlay header away within the first
    // few pixels of downward movement; restore it on upward scrolling.
    if (y <= 4) {
      setHeaderHidden(false);
    } else if (y >= HEADER_HIDE_SCROLL_THRESHOLD && delta >= 4) {
      setHeaderHidden(true);
    } else if (delta <= -7) {
      setHeaderHidden(false);
    }

    // Preserve the bottom navigation's existing collapse thresholds.
    if (y < 40) {
      setCompact(false);
    } else if (delta >= 7 && y > 70) {
      setCompact(true);
    } else if (delta <= -7) {
      setCompact(false);
    }

    // Accumulate micro-scroll deltas for stable, direction-aware response.
    if (Math.abs(delta) >= 4 || y <= 4) {
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
