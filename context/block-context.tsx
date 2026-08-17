import { useAuth } from '@/hooks/use-auth';
import {
    createBlock,
    deleteBlock,
    getBlockedUserIds,
} from '@/lib/supabase/blocks';
import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

interface BlockContextValue {
  blockedUserIds: string[];
  isLoading: boolean;
  isBlocked: (userId: string) => boolean;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  refreshBlocks: () => Promise<void>;
}

export const BlockContext =
  createContext<BlockContextValue | undefined>(
    undefined
  );

export function BlockProvider({
  children,
}: PropsWithChildren) {
  const { user, isAuthenticated } =
    useAuth();

  const [blockedUserIds, setBlockedUserIds] =
    useState<string[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const refreshBlocks =
    useCallback(async () => {
      if (
        !isAuthenticated ||
        !user?.id
      ) {
        setBlockedUserIds([]);
        return;
      }

      try {
        setIsLoading(true);

        const nextBlockedUserIds =
          await getBlockedUserIds(user.id);

        setBlockedUserIds(
          nextBlockedUserIds
        );
      } catch (error) {
        console.error(
          'Failed to load blocked users:',
          error
        );

        setBlockedUserIds([]);
      } finally {
        setIsLoading(false);
      }
    }, [
      isAuthenticated,
      user?.id,
    ]);

  useEffect(() => {
    void refreshBlocks();
  }, [refreshBlocks]);

  const isBlocked =
    useCallback(
      (userId: string) =>
        blockedUserIds.includes(userId),
      [blockedUserIds]
    );

  const blockUser =
    useCallback(
      async (blockedUserId: string) => {
        if (!user?.id) {
          throw new Error(
            'You must be signed in to block a user.'
          );
        }

        const normalizedBlockedUserId =
          blockedUserId.trim();

        if (!normalizedBlockedUserId) {
          throw new Error(
            'A user ID is required to block a user.'
          );
        }

        if (
          normalizedBlockedUserId ===
          user.id
        ) {
          throw new Error(
            'You cannot block yourself.'
          );
        }

        if (
          blockedUserIds.includes(
            normalizedBlockedUserId
          )
        ) {
          return;
        }

        setBlockedUserIds(
          (currentBlockedUserIds) => [
            ...currentBlockedUserIds,
            normalizedBlockedUserId,
          ]
        );

        try {
          await createBlock(
            user.id,
            normalizedBlockedUserId
          );
        } catch (error) {
          setBlockedUserIds(
            (currentBlockedUserIds) =>
              currentBlockedUserIds.filter(
                (userId) =>
                  userId !==
                  normalizedBlockedUserId
              )
          );

          throw error;
        }
      },
      [
        blockedUserIds,
        user?.id,
      ]
    );

  const unblockUser =
    useCallback(
      async (blockedUserId: string) => {
        if (!user?.id) {
          throw new Error(
            'You must be signed in to unblock a user.'
          );
        }

        const normalizedBlockedUserId =
          blockedUserId.trim();

        if (!normalizedBlockedUserId) {
          return;
        }

        if (
          !blockedUserIds.includes(
            normalizedBlockedUserId
          )
        ) {
          return;
        }

        setBlockedUserIds(
          (currentBlockedUserIds) =>
            currentBlockedUserIds.filter(
              (userId) =>
                userId !==
                normalizedBlockedUserId
            )
        );

        try {
          await deleteBlock(
            user.id,
            normalizedBlockedUserId
          );
        } catch (error) {
          setBlockedUserIds(
            (currentBlockedUserIds) => [
              ...currentBlockedUserIds,
              normalizedBlockedUserId,
            ]
          );

          throw error;
        }
      },
      [
        blockedUserIds,
        user?.id,
      ]
    );

  const value =
    useMemo<BlockContextValue>(
      () => ({
        blockedUserIds,
        isLoading,
        isBlocked,
        blockUser,
        unblockUser,
        refreshBlocks,
      }),
      [
        blockedUserIds,
        isLoading,
        isBlocked,
        blockUser,
        unblockUser,
        refreshBlocks,
      ]
    );

  return (
    <BlockContext.Provider value={value}>
      {children}
    </BlockContext.Provider>
  );
}

export function useBlock() {
  const context =
    useContext(BlockContext);

  if (!context) {
    throw new Error(
      'useBlock must be used inside a BlockProvider'
    );
  }

  return context;
}