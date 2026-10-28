import { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';

/**
 * Home: header position is maintained on the UI thread, independent of
 * React re-renders, momentum, and any rebound after the user's upward drag.
 * 0 = visible, SCREEN_HEADER_HEIGHT = hidden.
 */
export function useHomeStickyHeader(
  onFeedScroll: (offsetY: number) => void,
  onHeaderScrolled: (scrolled: boolean) => void,
  nativeInsetTop = 0
) {
  const hidden = useSharedValue(0);
  const previousY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const lastDragDirection = useSharedValue(0);
  const previousScrolled = useSharedValue(false);

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag(event) {
      isDragging.value = true;
      lastDragDirection.value = 0;
      previousY.value = Math.max(0, event.contentOffset.y + nativeInsetTop);
    },
    onScroll(event) {
      const y = Math.max(0, event.contentOffset.y + nativeInsetTop);
      const delta = y - previousY.value;
      previousY.value = y;

      if (isDragging.value && Math.abs(delta) >= 0.5) {
        lastDragDirection.value = delta > 0 ? 1 : -1;
      }

      // After an upward drag, iOS can rebound a few pixels in the opposite
      // direction. That is not a new downward gesture: leave the header shown.
      const reboundAfterReveal =
        !isDragging.value && lastDragDirection.value < 0 && delta > 0;

      if (!reboundAfterReveal) {
        hidden.value = y <= 2
          ? 0
          : Math.max(0, Math.min(SCREEN_HEADER_HEIGHT, hidden.value + delta));
      }

      const scrolled = y > 56;
      if (scrolled !== previousScrolled.value) {
        previousScrolled.value = scrolled;
        runOnJS(onHeaderScrolled)(scrolled);
      }
      // Bottom navigation retains its existing independent scroll thresholds.
      runOnJS(onFeedScroll)(y);
    },
    onEndDrag() {
      isDragging.value = false;
      if (lastDragDirection.value < 0) {
        // Settle fully open and remain there after the user's upward drag.
        hidden.value = withTiming(0, { duration: 110 });
      }
    },
    onMomentumEnd() {
      if (lastDragDirection.value < 0) {
        hidden.value = 0;
      }
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value / SCREEN_HEADER_HEIGHT,
    transform: [{ translateY: -hidden.value }],
  }));

  // When switching between independent scroll views (Composer tabs),
  // restore the floating header to its initial position. Other screens
  // retain precisely the same scroll behaviour unless they call resetHeader.
  const resetHeader = () => {
    hidden.value = 0;
    previousY.value = 0;
    isDragging.value = false;
    lastDragDirection.value = 0;
    previousScrolled.value = false;
  };

  // Expose the existing UI-thread scroll position for Profile's decorative
  // circle fade. No change to the sticky movement used on any screen.
  return { scrollHandler, headerStyle, scrollY: previousY, resetHeader };
}
