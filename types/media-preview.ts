import { CategoryId } from '@/constants/top3-categories';

export type PreviewSaveSource = {
  collectionId?: string;
  userId?: string;
  topic?: string;
};

export type PreviewSaveContext = {
  category: CategoryId;
  source?: PreviewSaveSource;
};
