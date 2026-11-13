/**
 * Prefix root-relative links in Markdown/MDX (`/docs/...`) with the configured
 * `base`, so the docs keep working when deployed under a GitHub Pages sub-path.
 */
export function rehypeBaseLinks({ base = '/' } = {}) {
  const prefix = base.replace(/\/$/, '');
  return (tree) => {
    if (!prefix) return;
    const visit = (node) => {
      if (node.type === 'element' && node.tagName === 'a') {
        const href = node.properties?.href;
        if (typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && !href.startsWith(prefix + '/')) {
          node.properties.href = prefix + href;
        }
      }
      if (node.children) node.children.forEach(visit);
    };
    visit(tree);
  };
}
