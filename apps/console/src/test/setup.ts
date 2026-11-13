import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does no layout: scrolling is a no-op.
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
