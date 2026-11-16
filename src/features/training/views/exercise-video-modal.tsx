import { useEvent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { AppButton } from '@/components/ui/app-button';
import { IconButton } from '@/components/ui/icon-button';
import { API_BASE_URL } from '@/config/env';
import {
  getYouTubeEmbedHtml,
  type ActiveExerciseVideo,
} from '@/features/training/models/exercise-video';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface ExerciseVideoModalProps {
  activeVideo: ActiveExerciseVideo | null;
  onClose: () => void;
  onOpenExternally: (url: string) => void;
}

/** https origin used as the embed's referrer; YouTube refuses embeds without one. */
const EMBED_BASE_URL = (() => {
  try {
    const { origin, protocol } = new URL(API_BASE_URL);
    return protocol === 'https:' ? origin : 'https://www.youtube-nocookie.com';
  } catch {
    return 'https://www.youtube-nocookie.com';
  }
})();

/**
 * Ventana emergente con el video del ejercicio: la rutina sigue visible detrás, oscurecida.
 * Se cierra con la X, tocando fuera de la ventana o con el botón "atrás" de Android.
 */
export function ExerciseVideoModal({
  activeVideo,
  onClose,
  onOpenExternally,
}: ExerciseVideoModalProps) {
  return (
    <Modal
      animationType="fade"
      statusBarTranslucent
      transparent
      visible={activeVideo !== null}
      onRequestClose={onClose}>
      <SafeAreaView style={styles.scrim}>
        <StatusBar style="light" />
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View accessibilityViewIsModal style={styles.window}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <SymbolView name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={14} tintColor={AppColors.neutral.white} />
            </View>
            <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
              {activeVideo?.title ?? ''}
            </Text>
            <IconButton
              color={AppColors.neutral.white}
              icon={{ ios: 'xmark', android: 'close', web: 'close' }}
              label="Cerrar video"
              style={styles.closeButton}
              onPress={onClose}
            />
          </View>
          <View style={styles.player}>
            {activeVideo?.video.kind === 'youtube' ? (
              <YouTubePlayer
                videoId={activeVideo.video.videoId}
                onOpenExternally={() => onOpenExternally(activeVideo.video.url)}
              />
            ) : activeVideo?.video.kind === 'file' ? (
              <FilePlayer
                url={activeVideo.video.url}
                onOpenExternally={() => onOpenExternally(activeVideo.video.url)}
              />
            ) : null}
          </View>
          <Text style={styles.hint}>Toca fuera del video para volver a la rutina.</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function YouTubePlayer({
  videoId,
  onOpenExternally,
}: {
  videoId: string;
  onOpenExternally: () => void;
}) {
  const [failed, setFailed] = useState(false);

  // The embed stays inside the player; links to YouTube itself open outside the app.
  function shouldLoad(request: WebViewNavigation & { isTopFrame?: boolean }) {
    if (request.isTopFrame === false) return true;
    if (request.url === 'about:blank' || request.url.startsWith(EMBED_BASE_URL)) return true;
    onOpenExternally();
    return false;
  }

  if (failed) return <PlaybackError onOpenExternally={onOpenExternally} />;

  return (
    <WebView
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      originWhitelist={['*']}
      renderLoading={() => <PlayerLoading />}
      source={{ html: getYouTubeEmbedHtml(videoId), baseUrl: EMBED_BASE_URL }}
      startInLoadingState
      style={styles.webView}
      onError={() => setFailed(true)}
      onShouldStartLoadWithRequest={shouldLoad}
    />
  );
}

function FilePlayer({ url, onOpenExternally }: { url: string; onOpenExternally: () => void }) {
  const player = useVideoPlayer(url, (videoPlayer) => {
    videoPlayer.play();
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  if (status === 'error') return <PlaybackError onOpenExternally={onOpenExternally} />;

  return (
    <View style={styles.fill}>
      <VideoView
        allowsPictureInPicture={false}
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        nativeControls
        player={player}
        style={styles.fill}
      />
      {status === 'loading' ? <PlayerLoading /> : null}
    </View>
  );
}

function PlayerLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={AppColors.neutral.white} size="large" />
    </View>
  );
}

function PlaybackError({ onOpenExternally }: { onOpenExternally: () => void }) {
  return (
    <View style={styles.error}>
      <SymbolView
        name={{ ios: 'exclamationmark.triangle.fill', android: 'error', web: 'error' }}
        size={32}
        tintColor={AppColors.brand.primary}
      />
      <Text accessibilityRole="alert" style={styles.errorText}>
        No pudimos reproducir el video aquí.
      </Text>
      <AppButton title="Abrir en el navegador" variant="outline" onPress={onOpenExternally} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.overlay.scrim,
    paddingHorizontal: 16,
  },
  window: {
    width: '100%',
    maxWidth: 560,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: AppColors.surface.dark,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.button,
    fontSize: 16,
    lineHeight: 22,
  },
  closeButton: { borderRadius: 22 },
  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  hint: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  webView: { flex: 1, backgroundColor: '#000000' },
  fill: { flex: 1 },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.three,
    paddingHorizontal: AppSpacing.four,
  },
  errorText: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
  },
});
