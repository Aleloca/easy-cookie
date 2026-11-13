import { createEasyCookie } from './runtime';

export * from './shared';
export { createEasyCookie };

/** The page-wide easy-cookie instance (the engine is a singleton). */
const EasyCookie = createEasyCookie();
export default EasyCookie;
export { EasyCookie };
