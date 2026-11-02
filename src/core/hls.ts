/* Reddit's own videos are HLS streams. Safari plays HLS itself (the iPhone,
   an iPad, a Mac's Safari). Chromium's (Chrome, Brave) says it can too, yet
   reddit's sit loading forever in Brave: older ones can't at all. There,
   hls.js plays them: fetched only then, once, from
   jsDelivr (pinned and checked by its hash, so nothing else can run in its
   place), never on the iPhone. If it can't load, the video plays reddit's
   plain MP4 instead, without sound (reddit keeps that apart). */

const HLS_JS = {
  src: 'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js',
  integrity: 'sha384-V5ruNBgmYcC3SJRUQeNykAAAgde5gOFq/Hu0CZj7bygDP0yRIhkvX8+w0u/7mRvr',
};

interface Hls {
  loadSource(url: string): void;
  attachMedia(video: HTMLVideoElement): void;
  startLoad(): void;
  destroy(): void;
}
interface HlsClass {
  new (config: { autoStartLoad: boolean }): Hls;
  isSupported(): boolean;
}

// Safari's own: not Chromium's (navigator.userAgentData: Chromium's only)
export const playsHls = () => !('userAgentData' in navigator)
  && document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';

let loading: Promise<HlsClass> | null = null;

function loadHlsJs(): Promise<HlsClass> {
  loading ??= new Promise<HlsClass>((resolve, reject) => {
    const script = document.createElement('script');
    script.dataset.restyle = '';  // ours: the blocker keeps it
    script.src = HLS_JS.src;
    script.integrity = HLS_JS.integrity;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      const Hls = (window as { Hls?: HlsClass }).Hls;
      if (Hls?.isSupported()) resolve(Hls);
      else reject(new Error('hls.js: not supported here'));
    };
    script.onerror = () => reject(new Error('hls.js: did not load'));
    document.head.append(script);
  }).catch((error) => {
    loading = null;  // the next video tries again
    throw error;
  });
  return loading;
}

/* Plays the stream at url in video, through hls.js. Nothing of the video
   loads until it's played (as preload="none"). Calls fallback if hls.js
   can't play here. Returns the clean-up. */
export function attachHls(video: HTMLVideoElement, url: string, fallback: () => void): () => void {
  let hls: Hls | null = null;
  let gone = false;
  const start = () => hls?.startLoad();
  loadHlsJs().then(
    (Hls) => {
      if (gone) return;
      hls = new Hls({ autoStartLoad: false });
      hls.loadSource(url);
      hls.attachMedia(video);
      video.addEventListener('play', start);
      if (!video.paused) start();
    },
    () => gone || fallback(),
  );
  return () => {
    gone = true;
    video.removeEventListener('play', start);
    hls?.destroy();
  };
}
