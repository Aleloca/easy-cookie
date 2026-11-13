// Stand-in for `@easy-cookie/core` in tests (aliased in vitest.config.ts).
import { createFakeApi } from './fake-api';

const { api } = createFakeApi();
export default api;
