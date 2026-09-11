type StopMediaPreview = () => void;

export type MediaPreviewChannel =
  | 'audio'
  | 'trailer'
  | 'book';

const stopHandlers:
  Partial<Record<MediaPreviewChannel, StopMediaPreview>> = {};

function registerMediaPreviewStopper(
  channel: MediaPreviewChannel,
  handler: StopMediaPreview
) {
  stopHandlers[channel] = handler;

  return () => {
    if (stopHandlers[channel] === handler) {
      delete stopHandlers[channel];
    }
  };
}

function stopMediaPreviewFromCoordinator(
  channel: MediaPreviewChannel
) {
  stopHandlers[channel]?.();
}

export function registerAudioPreviewStopper(
  handler: StopMediaPreview
) {
  return registerMediaPreviewStopper(
    'audio',
    handler
  );
}

export function registerTrailerPreviewStopper(
  handler: StopMediaPreview
) {
  return registerMediaPreviewStopper(
    'trailer',
    handler
  );
}

export function registerBookPreviewStopper(
  handler: StopMediaPreview
) {
  return registerMediaPreviewStopper(
    'book',
    handler
  );
}

export function stopAudioPreviewFromCoordinator() {
  stopMediaPreviewFromCoordinator('audio');
}

export function stopTrailerPreviewFromCoordinator() {
  stopMediaPreviewFromCoordinator('trailer');
}

export function stopBookPreviewFromCoordinator() {
  stopMediaPreviewFromCoordinator('book');
}

export function stopOtherMediaPreviewsFromCoordinator(
  activeChannel: MediaPreviewChannel
) {
  (
    Object.keys(stopHandlers) as MediaPreviewChannel[]
  ).forEach((channel) => {
    if (channel !== activeChannel) {
      stopHandlers[channel]?.();
    }
  });
}

export function stopAllMediaPreviewsFromCoordinator() {
  (
    Object.keys(stopHandlers) as MediaPreviewChannel[]
  ).forEach((channel) => {
    stopHandlers[channel]?.();
  });
}
