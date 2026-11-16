import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import type { ActiveExerciseVideo, ExerciseVideo } from '@/features/training/models/exercise-video';

/**
 * Reproduce el video de un ejercicio igual que en la rutina del socio: YouTube y archivos
 * dentro de la app (ExerciseVideoModal); cualquier otra página https, en el navegador.
 */
export function useExerciseVideoPlayer() {
  const [activeVideo, setActiveVideo] = useState<ActiveExerciseVideo | null>(null);

  return {
    activeVideo,
    openVideo(title: string, video: ExerciseVideo) {
      if (video.kind === 'link') {
        void WebBrowser.openBrowserAsync(video.url);
        return;
      }
      setActiveVideo({ title, video });
    },
    closeVideo() {
      setActiveVideo(null);
    },
    openExternally(url: string) {
      setActiveVideo(null);
      void WebBrowser.openBrowserAsync(url);
    },
  };
}
