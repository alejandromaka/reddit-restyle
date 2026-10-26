/* What the loader and the restyle it runs share, on the page itself (the
   DOM: the same in any script world). The loader marks <html> with the
   build it ran; the restyle's account menu then has Update Reddit Restyle,
   which asks the loader for the latest build by an event. */

export const LOADER_ATTRIBUTE = 'restyleLoader';  // <html data-restyle-loader="0.1.0+abc1234">
export const UPDATE_EVENT = 'restyle:update';

// The build the loader ran, if a loader ran it
export const loadedBuild = () => document.documentElement.dataset[LOADER_ATTRIBUTE] ?? null;

// Asks the loader for the latest build (it says how that went on the page)
export const requestUpdate = () => document.dispatchEvent(new CustomEvent(UPDATE_EVENT));

// The first line of every published build: its version
export const versionOf = (code: string) => /^\/\/ Reddit Restyle (\S+)/.exec(code)?.[1] ?? null;
