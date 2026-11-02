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
