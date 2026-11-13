import { formatPolicyDate, type PolicyCategory, type PolicyModel, type PolicyService } from './model';

export interface RenderPolicyOptions {
  /** Heading level of category titles (2 → `<h2>`). Default 2. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Prefix for section ids (`#ec-policy-measurement`). Default `ec-policy-`. */
  idPrefix?: string;
  /** Show the "last updated / revision" line. Default true. */
  meta?: boolean;
  /** Omit categories without services. Default false. */
  hideEmpty?: boolean;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESC[c]);
}

function safeUrl(url: string): string | undefined {
  return /^(https?:|mailto:|\/|#)/i.test(url.trim()) ? url : undefined;
}

export interface PolicyRow {
  service: PolicyService;
  cookie?: PolicyService['cookies'][number];
  /** First row of this service (for grouping). */
  first: boolean;
}

/** Flatten a category to table rows: one per cookie, or one per service without cookies. */
export function policyRows(cat: PolicyCategory): PolicyRow[] {
  const rows: PolicyRow[] = [];
  for (const service of cat.services) {
    if (service.cookies.length === 0) rows.push({ service, first: true });
    else service.cookies.forEach((cookie, i) => rows.push({ service, cookie, first: i === 0 }));
  }
  return rows;
}

function visible(model: PolicyModel, opts: RenderPolicyOptions): PolicyCategory[] {
  return opts.hideEmpty ? model.categories.filter((c) => c.services.length > 0) : model.categories;
}

/**
 * Semantic HTML for the cookie section of a policy: one `<section>` and one
 * `<table>` per category. Class names only (`ec-policy*`), no inline styles.
 */
export function renderPolicyHtml(model: PolicyModel, opts: RenderPolicyOptions = {}): string {
  const h = `h${opts.headingLevel ?? 2}`;
  const prefix = opts.idPrefix ?? 'ec-policy-';
  const L = model.labels;
  const e = escapeHtml;
  const out: string[] = [`<div class="ec-policy" lang="${e(model.lang)}">`];

  if (opts.meta !== false) {
    const parts: string[] = [];
    const date = formatPolicyDate(model);
    if (date) parts.push(`${e(L.updated)}: <time datetime="${e(model.date!)}">${e(date)}</time>`);
    parts.push(`${e(L.revision)}: <span class="ec-policy__revision">${e(model.revision)}</span>`);
    out.push(`<p class="ec-policy__meta">${parts.join(' · ')}</p>`);
  }

  for (const cat of visible(model, opts)) {
    const id = `${prefix}${cat.id}`;
    out.push(
      `<section class="ec-policy__category" id="${e(id)}" data-category="${e(cat.id)}" aria-labelledby="${e(id)}-title">`,
    );
    out.push(`<${h} class="ec-policy__title" id="${e(id)}-title">${e(cat.title)}</${h}>`);
    if (cat.readOnly) out.push(`<p class="ec-policy__badge">${e(L.alwaysOn)}</p>`);
    if (cat.description) out.push(`<p class="ec-policy__description">${e(cat.description)}</p>`);

    const rows = policyRows(cat);
    if (rows.length === 0) {
      out.push(`<p class="ec-policy__empty">${e(L.noCookies)}</p>`);
    } else {
      out.push('<div class="ec-policy__table-wrap">');
      out.push('<table class="ec-policy__table">');
      out.push(`<caption class="ec-policy__caption">${e(L.caption.replace('{category}', cat.title))}</caption>`);
      out.push(
        '<thead><tr>' +
          [L.cookie, L.service, L.provider, L.duration, L.purpose].map((t) => `<th scope="col">${e(t)}</th>`).join('') +
          '</tr></thead>',
      );
      out.push('<tbody>');
      for (const { service, cookie } of rows) {
        const name = cookie
          ? `<code class="ec-policy__cookie"${cookie.pattern ? ` title="${e(cookie.name)}"` : ''}>${e(cookie.displayName)}</code>` +
            (cookie.domain ? ` <span class="ec-policy__domain">${e(cookie.domain)}</span>` : '')
          : `<span class="ec-policy__none">${e(L.noCookie)}</span>`;
        const url = service.privacyUrl ? safeUrl(service.privacyUrl) : undefined;
        const provider = url
          ? `<a class="ec-policy__link" href="${e(url)}" rel="noopener noreferrer" target="_blank">${e(service.provider || L.privacyPolicy)}</a>`
          : e(service.provider);
        const purpose = cookie?.description || service.purpose;
        out.push(
          `<tr data-service="${e(service.id)}">` +
            `<th scope="row">${name}</th>` +
            `<td class="ec-policy__service">${e(service.label)}</td>` +
            `<td class="ec-policy__provider">${provider}</td>` +
            `<td class="ec-policy__duration">${e(cookie?.duration ?? '')}</td>` +
            `<td class="ec-policy__purpose">${e(purpose)}</td>` +
            '</tr>',
        );
      }
      out.push('</tbody></table></div>');
    }
    out.push('</section>');
  }
  out.push('</div>');
  return out.join('\n');
}

function mdCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/** GitHub-flavoured Markdown version of the policy (one table per category). */
export function renderPolicyMarkdown(model: PolicyModel, opts: Pick<RenderPolicyOptions, 'headingLevel' | 'meta' | 'hideEmpty'> = {}): string {
  const hashes = '#'.repeat(opts.headingLevel ?? 2);
  const L = model.labels;
  const out: string[] = [];
  if (opts.meta !== false) {
    const date = formatPolicyDate(model);
    out.push([date ? `${L.updated}: ${date}` : '', `${L.revision}: ${model.revision}`].filter(Boolean).join(' · '), '');
  }
  for (const cat of visible(model, opts)) {
    out.push(`${hashes} ${cat.title}`, '');
    if (cat.readOnly) out.push(`*${L.alwaysOn}*`, '');
    if (cat.description) out.push(cat.description, '');
    const rows = policyRows(cat);
    if (rows.length === 0) {
      out.push(L.noCookies, '');
      continue;
    }
    out.push(`| ${[L.cookie, L.service, L.provider, L.duration, L.purpose].map(mdCell).join(' | ')} |`);
    out.push('| --- | --- | --- | --- | --- |');
    for (const { service, cookie } of rows) {
      const name = cookie ? `\`${cookie.displayName.replace(/`/g, '')}\`` : L.noCookie;
      const provider = service.privacyUrl
        ? `[${mdCell(service.provider || L.privacyPolicy).replace(/[[\]]/g, '\\$&')}](${service.privacyUrl.replace(/[()\s]/g, encodeURIComponent)})`
        : mdCell(service.provider);
      out.push(
        `| ${name} | ${mdCell(service.label)} | ${provider} | ${mdCell(cookie?.duration ?? '')} | ${mdCell(cookie?.description || service.purpose)} |`,
      );
    }
    out.push('');
  }
  return out.join('\n').trimEnd() + '\n';
}
