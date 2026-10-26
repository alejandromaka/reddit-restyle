// The Userscripts app's GM API, as far as the loader uses it
declare namespace GM {
  function getValue<T>(key: string, fallback?: T): Promise<T | undefined>;
  function setValue(key: string, value: unknown): Promise<void>;
  function xmlHttpRequest(details: {
    method: 'GET';
    url: string;
    onload?: (response: { status: number; responseText: string }) => void;
    onerror?: (error: unknown) => void;
    ontimeout?: () => void;
    timeout?: number;
  }): void;
  const registerMenuCommand: ((caption: string, onClick: () => void) => void) | undefined;
}

// Where the published build is, by the build
declare const __BUNDLE_URL__: string;
