import ActionSheet from '@/components/action-sheet';
import {
  getInAppShareCollectionId,
  sharePublishedCollectionOutside,
  type SharePublishedCollectionInput,
} from '@/lib/share';
import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Standard Top 3 share-choice UI. Each screen mounts the returned sheet;
 * while DM is disabled, sharing goes directly to the native system sheet.
 */
export function usePublishedCollectionShare() {
  const [pendingShare, setPendingShare] =
    useState<SharePublishedCollectionInput | null>(null);

  const sharePublishedCollection = useCallback(
    async (input: SharePublishedCollectionInput): Promise<void> => {
      if (getInAppShareCollectionId(input.postId)) {
        setPendingShare(input);
        return;
      }
      await sharePublishedCollectionOutside(input);
    },
    []
  );

  const closeShareSheet = () => setPendingShare(null);

  const shareSheet = (
    <ActionSheet
      visible={pendingShare !== null}
      title="Share Top 3"
      message={pendingShare?.title}
      onClose={closeShareSheet}
      actions={[
        {
          label: 'Send in Top 3',
          onPress: () => {
            const collectionId = pendingShare
              ? getInAppShareCollectionId(pendingShare.postId)
              : null;
            closeShareSheet();
            if (collectionId) {
              router.push({
                pathname: '/dm-share-top3',
                params: { collectionId },
              } as Href);
            }
          },
        },
        {
          label: 'Share outside Top 3',
          onPress: () => {
            const target = pendingShare;
            closeShareSheet();
            if (target) {
              void sharePublishedCollectionOutside(target);
            }
          },
        },
        {
          label: 'Cancel',
          variant: 'cancel',
          onPress: closeShareSheet,
        },
      ]}
    />
  );

  return { sharePublishedCollection, shareSheet };
}
