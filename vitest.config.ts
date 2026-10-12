import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __CSS__: JSON.stringify('.rr-flex{display:flex}'),
  },
});
