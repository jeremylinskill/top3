import {
    registerBookPreviewStopper,
    stopOtherMediaPreviewsFromCoordinator,
} from '@/lib/media-preview-coordinator';
import {
    BookDescriptionSource,
    getBookDescriptionResult,
} from '@/providers/books';
import { PreviewSaveContext } from '@/types/media-preview';
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
  activeSaveContext: PreviewSaveContext | null;
  activeBookDescription: string | null;
  activeBookDescriptionSource:
    BookDescriptionSource | null;
  isBookLoading: boolean;
  openBookPreview: (
    item: Top3Item,
    saveContext?: PreviewSaveContext
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

export function BookPreviewProvider({
  children,
}: BookPreviewProviderProps) {
  const [
    activeBookItem,
    setActiveBookItem,
  ] = useState<Top3Item | null>(null);

  const [
    activeSaveContext,
    setActiveSaveContext,
  ] = useState<PreviewSaveContext | null>(null);

  const [
    activeBookDescription,
    setActiveBookDescription,
  ] = useState<string | null>(null);

  const [
    activeBookDescriptionSource,
    setActiveBookDescriptionSource,
  ] = useState<BookDescriptionSource | null>(
    null
  );

  const [
    isBookLoading,
    setIsBookLoading,
  ] = useState(false);

  const bookRequestIdRef = useRef(0);

  const closeBookPreview = useCallback(() => {
    bookRequestIdRef.current += 1;
    setActiveBookItem(null);
    setActiveSaveContext(null);
    setActiveBookDescription(null);
    setActiveBookDescriptionSource(null);
    setIsBookLoading(false);
  }, []);

  useEffect(() => {
    return registerBookPreviewStopper(
      closeBookPreview
    );
  }, [closeBookPreview]);

  async function openBookPreview(
    item: Top3Item,
    saveContext?: PreviewSaveContext
  ): Promise<boolean> {
    const requestId =
      bookRequestIdRef.current + 1;
    bookRequestIdRef.current = requestId;

    stopOtherMediaPreviewsFromCoordinator(
      'book'
    );

    setActiveBookItem(item);
    setActiveSaveContext(
      saveContext ?? null
    );
    setActiveBookDescription(null);
    setActiveBookDescriptionSource(null);
    setIsBookLoading(true);

    try {
      const result =
        await getBookDescriptionResult(
          item
        );

      if (
        bookRequestIdRef.current !== requestId
      ) {
        return false;
      }

      if (!result) {
        return false;
      }

      setActiveBookDescription(
        result.description
      );
      setActiveBookDescriptionSource(
        result.source
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
        activeSaveContext,
        activeBookDescription,
        activeBookDescriptionSource,
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
