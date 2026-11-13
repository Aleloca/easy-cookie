/** Integration snippets shown on site creation and on the API keys screen. */

export function serverOrigin(): string {
  return typeof window === 'undefined' ? 'https://consent.example.com' : window.location.origin;
}

export function embedSnippet(origin: string, publicKey: string): string {
  return `<script src="${origin}/v1/sites/${publicKey}/embed.js"></script>`;
}

// TODO(adapters): align with the final @easy-cookie/next API once packages/next lands.
export function nextSnippet(origin: string, publicKey: string): string {
  return `// app/layout.tsx
import { EasyCookieHead, EasyCookieProvider } from '@easy-cookie/next';

const remote = { endpoint: '${origin}', siteKey: '${publicKey}' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <EasyCookieHead remote={remote} />
      </head>
      <body>
        <EasyCookieProvider config={{ remote }}>{children}</EasyCookieProvider>
      </body>
    </html>
  );
}`;
}

export function ciSnippet(origin: string): string {
  return `# EASY_COOKIE_SECRET: the site's sk_… key, stored as a CI secret
curl -fsS -X PUT "${origin}/v1/config" \\
  -H "Authorization: Bearer $EASY_COOKIE_SECRET" \\
  -H "Content-Type: application/json" \\
  --data "{\\"config\\": $(cat easy-cookie.config.json), \\"publish\\": true, \\"note\\": \\"deploy $GITHUB_SHA\\"}"`;
}
