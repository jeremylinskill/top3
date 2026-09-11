import {
    registerBookPreviewStopper,
    stopOtherMediaPreviewsFromCoordinator,
} from '@/lib/media-preview-coordinator';
import {
    getBookDescription,
} from '@/providers/books';
import { Top3Item } from '@/types/top3-item';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

type BookPreviewContextValue = {
  activeBookItem: Top3Item | null;
  activeBookDescription: string | null;
  isBookLoading: boolean;
  openBookPreview: (
    item: Top3Item
  ) => Promise<boolean>;
  closeBookPreview: () => void;
};

const BookPreviewContext =
  createContext<
    BookPreviewContextValue | undefined
  >(undefined);

type BookPreviewProviderProps = {
  children: ReactNode;
};

function getBookVolumeId(
  item: Top3Item
): string | undefined {
  const explicitVolumeId =
    item.googleBooksVolumeId?.trim();

  if (explicitVolumeId) {
    return explicitVolumeId;
  }

  const legacyItemId = item.id.trim();

  if (
    !legacyItemId ||
    legacyItemId.startsWith('curated-book-')
  ) {
    return undefined;
  }

  return legacyItemId;
}

export function BookPreviewProvider({
  children,
}: BookPreviewProviderProps) {
  const [
    activeBookItem,
    setActiveBookItem,
  ] = useState<Top3Item | null>(null);

  const [
    activeBookDescription,
    setActiveBookDescription,
  ] = useState<string | null>(null);

  const [
    isBookLoading,
    setIsBookLoading,
  ] = useState(false);

  const bookRequestIdRef = useRef(0);

  const closeBookPreview = useCallback(() => {
    bookRequestIdRef.current += 1;
    setActiveBookItem(null);
    setActiveBookDescription(null);
    setIsBookLoading(false);
  }, []);

  useEffect(() => {
    return registerBookPreviewStopper(
      closeBookPreview
    );
  }, [closeBookPreview]);

  async function openBookPreview(
    item: Top3Item
  ): Promise<boolean> {
    const volumeId =
      getBookVolumeId(item);

    if (!volumeId) {
      return false;
    }

    const requestId =
      bookRequestIdRef.current + 1;
    bookRequestIdRef.current = requestId;

    stopOtherMediaPreviewsFromCoordinator(
      'book'
    );
    setIsBookLoading(true);

    try {
      const description =
        await getBookDescription(
          volumeId
        );

      if (
        bookRequestIdRef.current !== requestId
      ) {
        return false;
      }

      if (!description) {
        return false;
      }

      setActiveBookItem(item);
      setActiveBookDescription(
        description
      );

      return true;
    } catch (error) {
      if (
        bookRequestIdRef.current === requestId &&
        __DEV__
      ) {
        console.log(
          `Failed to load book description for ${item.title}:`,
          error
        );
      }

      return false;
    } finally {
      if (
        bookRequestIdRef.current === requestId
      ) {
        setIsBookLoading(false);
      }
    }
  }

  return (
    <BookPreviewContext.Provider
      value={{
        activeBookItem,
        activeBookDescription,
        isBookLoading,
        openBookPreview,
        closeBookPreview,
      }}>
      {children}
    </BookPreviewContext.Provider>
  );
}

export function useBookPreview() {
  const context =
    useContext(BookPreviewContext);

  if (!context) {
    throw new Error(
      'useBookPreview must be used within a BookPreviewProvider.'
    );
  }

  return context;
}
