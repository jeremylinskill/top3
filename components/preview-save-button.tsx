import IconButton from '@/components/icon-button';
import { useSavedItems } from '@/context/saved-items-context';
import { usePreviewSheetColors } from '@/hooks/use-preview-sheet-colors';
import { PreviewSaveContext } from '@/types/media-preview';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';

type PreviewSaveButtonProps = {
  item: Top3Item;
  saveContext: PreviewSaveContext;
};

export default function PreviewSaveButton({
  item,
  saveContext,
}: PreviewSaveButtonProps) {
  const previewColors =
    usePreviewSheetColors();

  const {
    isSaved,
    toggleSavedItem,
    isLoading,
  } = useSavedItems();

  const itemIsSaved = isSaved(
    saveContext.category,
    item.id
  );

  return (
    <IconButton
      backgroundColor={
        previewColors.control
      }
      onPress={() => {
        toggleSavedItem(
          saveContext.category,
          item,
          saveContext.source
        );
      }}
      disabled={isLoading}
      selected={itemIsSaved}
      accessibilityLabel={
        itemIsSaved
          ? `Remove ${item.title} from Saved`
          : `Save ${item.title}`
      }>
      <Ionicons
        name={
          itemIsSaved
            ? 'bookmark'
            : 'bookmark-outline'
        }
        size={19}
        color={
          previewColors.primaryText
        }
      />
    </IconButton>
  );
}
