import { useCallback, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';

/**
 * A direction-aware overlay-header offset measured in screen pixels.
 * A downward drag moves the header away by the same distance; an upward
 * drag brings it back. There is no two-state timed hide/reveal transition.
 *
 * Kept separate from the bottom-tab compact logic intentionally.
 */
export function useScrollLinkedHeader() {
  const progress = useRef(new Animated.Value(0)).current;
  // Native-driven scroll track for Home. Other screens keep their existing
  // JavaScript onScroll handler until their individual rollouts are tested.
  const nativeScrollY = useRef(new Animated.Value(0)).current;
  const nativeProgress = useMemo(
    () => Animated.diffClamp(nativeScrollY, 0, SCREEN_HEADER_HEIGHT),
    [nativeScrollY]
  );
  const lastY = useRef(0);
  const hiddenPixels = useRef(0);

  const onScroll = useCallback((offsetY: number) => {
    const y = Number.isFinite(offsetY) ? Math.max(0, offsetY) : 0;
    const delta = y - lastY.current;
    lastY.current = y;

    if (y <= 2) {
      hiddenPixels.current = 0;
    } else {
      hiddenPixels.current = Math.max(
        0,
        Math.min(
          SCREEN_HEADER_HEIGHT,
          y,
          hiddenPixels.current + delta
        )
      );
    }

    // An Animated.Value updates the view without re-rendering the screen
    // for each pixel of scrolling. The range is 0 (shown) to 44 (hidden).
    progress.setValue(hiddenPixels.current);
  }, [progress]);

  return { progress, onScroll, nativeScrollY, nativeProgress };
}
