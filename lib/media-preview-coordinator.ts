type StopMediaPreview = () => void;

let stopAudioPreviewHandler: StopMediaPreview | null = null;
let stopTrailerPreviewHandler: StopMediaPreview | null = null;

export function registerAudioPreviewStopper(
  handler: StopMediaPreview
) {
  stopAudioPreviewHandler = handler;

  return () => {
    if (stopAudioPreviewHandler === handler) {
      stopAudioPreviewHandler = null;
    }
  };
}

export function registerTrailerPreviewStopper(
  handler: StopMediaPreview
) {
  stopTrailerPreviewHandler = handler;

  return () => {
    if (stopTrailerPreviewHandler === handler) {
      stopTrailerPreviewHandler = null;
    }
  };
}

export function stopAudioPreviewFromCoordinator() {
  stopAudioPreviewHandler?.();
}

export function stopTrailerPreviewFromCoordinator() {
  stopTrailerPreviewHandler?.();
}

export function stopAllMediaPreviewsFromCoordinator() {
  stopAudioPreviewFromCoordinator();
  stopTrailerPreviewFromCoordinator();
}
