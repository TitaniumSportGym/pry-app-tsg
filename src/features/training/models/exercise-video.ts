/**
 * How an exercise video is played inside the app. Trainers attach links:
 * YouTube videos are embedded, video files (or Cloudinary uploads) use the
 * native player, and any other https page is opened in the browser.
 */

export type ExerciseVideo =
  | { kind: "youtube"; url: string; videoId: string }
  | { kind: "file"; url: string }
  | { kind: "link"; url: string };

/** A video being played inside the app (links to other pages open in the browser). */
export interface ActiveExerciseVideo {
  title: string;
  video: Extract<ExerciseVideo, { kind: "youtube" | "file" }>;
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_PATH_PREFIXES = ["/embed/", "/shorts/", "/live/", "/v/"];
const VIDEO_FILE_EXTENSION = /\.(mp4|m4v|mov|webm|m3u8)$/i;

function getYouTubeId(url: URL) {
  const host = url.hostname.toLowerCase();
  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = url.pathname.slice(1).split("/")[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    const prefix = YOUTUBE_PATH_PREFIXES.find((path) => url.pathname.startsWith(path));
    candidate = prefix
      ? url.pathname.slice(prefix.length).split("/")[0]
      : url.pathname === "/watch"
        ? url.searchParams.get("v")
        : null;
  }

  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
}

function isVideoFile(url: URL) {
  const isCloudinaryVideo =
    url.hostname.toLowerCase() === "res.cloudinary.com" && url.pathname.includes("/video/upload/");
  return isCloudinaryVideo || VIDEO_FILE_EXTENSION.test(url.pathname);
}

/** Only https links are accepted; anything else is treated as "no video". */
export function getExerciseVideo(rawUrl: string | null | undefined): ExerciseVideo | null {
  if (!rawUrl) return null;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const videoId = getYouTubeId(url);
  if (videoId) return { kind: "youtube", url: rawUrl, videoId };
  if (isVideoFile(url)) return { kind: "file", url: rawUrl };
  return { kind: "link", url: rawUrl };
}

/**
 * Page that embeds the YouTube player. YouTube rejects embeds without a referrer
 * (error 153), so the WebView loads it with an https base URL.
 */
export function getYouTubeEmbedHtml(videoId: string) {
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
      iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe
      src="${src}"
      title="Video del ejercicio"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  </body>
</html>`;
}
