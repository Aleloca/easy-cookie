import type { CSSProperties } from 'react';
import { catalog } from '../../api/endpoints';
import type { CatalogEntry } from '../../api/types';
import { useI18n } from '../../i18n';
import { CATEGORY_COLORS, EXTRA_COLOR } from '../../lib/catalog';
import { useResource } from '../../lib/hooks';
import { categoryTitle } from '../site/common';

/** The catalog, fetched once per page load and shared by every screen. */
export function useCatalog() {
  return useResource<CatalogEntry[]>(() => catalog.list(), []);
}

/** Filled square in the category's banner colour, followed by its title. */
export function CategoryTag({ id }: { id: string }) {
  const { lang } = useI18n();
  return (
    <span className="cat-tag">
      <i className="cat-sq" style={{ '--c': CATEGORY_COLORS[id] ?? EXTRA_COLOR } as CSSProperties} aria-hidden="true" />
      {categoryTitle(id, lang)}
    </span>
  );
}
