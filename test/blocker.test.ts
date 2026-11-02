// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { takeOver } from '../src/shell/blocker';

describe('takeOver', () => {
  afterEach(() => {
    delete (window as { jQuery?: unknown }).jQuery;
  });

  // On a computer reddit-init.js can run before us (no Reddit Blocker there):
  // its jQuery must never start reddit's code on our page
  it('holds the ready of a jQuery that reddit-init.js left', () => {
    const holdReady = vi.fn();
    (window as { jQuery?: unknown }).jQuery = { holdReady };
    takeOver('listing');
    expect(holdReady).toHaveBeenCalledWith(true);
  });

  it('without reddit’s jQuery, nothing to hold', () => {
    expect(() => takeOver('listing')).not.toThrow();
  });
});

// reddit-init.js's es5-shim: splice(start) with no count removes nothing
describe('takeOver, with reddit-init.js run first', () => {
  it('still draws once the HTML is parsed', () => {
    const splice = Array.prototype.splice;
    Array.prototype.splice = function (this: unknown[], ...args: unknown[]) {
      return args.length < 2 ? [] : (splice.apply(this, args as [number, number]) as unknown[]);
    } as typeof splice;
    try {
      Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
      const shell = takeOver('listing');
      const drawn = vi.fn();
      shell.ready(drawn);
      Object.defineProperty(document, 'readyState', { value: 'interactive', configurable: true });
      document.dispatchEvent(new Event('DOMContentLoaded'));
      expect(drawn).toHaveBeenCalledOnce();
    } finally {
      Array.prototype.splice = splice;
      delete (document as { readyState?: string }).readyState;
    }
  });
});
