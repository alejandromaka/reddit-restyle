/* A video's sound: as you left the last one. Mute one and the next starts
   muted; unmute one and the next plays sound (this device remembers it).
   Until you've touched one, videos play sound, as reddit.com's. */

const KEY = 'reddit-restyle:muted';

export const isMuted = () => localStorage.getItem(KEY) === 'true';

export function rememberSound(video: HTMLVideoElement) {
  localStorage.setItem(KEY, String(video.muted));
}
