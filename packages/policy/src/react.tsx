import type { EasyCookieConfig } from '@easy-cookie/core/shared';
import { buildPolicyModel, formatPolicyDate, type BuildPolicyOptions } from './model';
import { policyRows, type RenderPolicyOptions } from './render';

export interface CookiePolicyProps extends BuildPolicyOptions, RenderPolicyOptions {
  config: EasyCookieConfig;
  lang: string;
  className?: string;
}

/**
 * The cookie section of a policy page, generated from the config.
 * No hooks and no browser APIs: works as a React Server Component.
 * Same markup and class names as `renderPolicyHtml()`.
 */
export function CookiePolicy({
  config,
  lang,
  date,
  labels,
  headingLevel = 2,
  idPrefix = 'ec-policy-',
  meta = true,
  hideEmpty = false,
  className,
}: CookiePolicyProps) {
  const model = buildPolicyModel(config, lang, { date, labels });
  const L = model.labels;
  const H = `h${headingLevel}` as 'h2';
  const displayDate = formatPolicyDate(model);
  const categories = hideEmpty ? model.categories.filter((c) => c.services.length > 0) : model.categories;

  return (
    <div className={['ec-policy', className].filter(Boolean).join(' ')} lang={model.lang}>
      {meta && (
        <p className="ec-policy__meta">
          {displayDate && (
            <>
              {L.updated}: <time dateTime={model.date}>{displayDate}</time>
              {' · '}
            </>
          )}
          {L.revision}: <span className="ec-policy__revision">{model.revision}</span>
        </p>
      )}
      {categories.map((cat) => {
        const id = `${idPrefix}${cat.id}`;
        const rows = policyRows(cat);
        return (
          <section key={cat.id} className="ec-policy__category" id={id} data-category={cat.id} aria-labelledby={`${id}-title`}>
            <H className="ec-policy__title" id={`${id}-title`}>
              {cat.title}
            </H>
            {cat.readOnly && <p className="ec-policy__badge">{L.alwaysOn}</p>}
            {cat.description && <p className="ec-policy__description">{cat.description}</p>}
            {rows.length === 0 ? (
              <p className="ec-policy__empty">{L.noCookies}</p>
            ) : (
              <div className="ec-policy__table-wrap">
                <table className="ec-policy__table">
                  <caption className="ec-policy__caption">{L.caption.replace('{category}', cat.title)}</caption>
                  <thead>
                    <tr>
                      {[L.cookie, L.service, L.provider, L.duration, L.purpose].map((t) => (
                        <th key={t} scope="col">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ service, cookie }) => (
                      <tr key={`${service.id}:${cookie?.name ?? ''}`} data-service={service.id}>
                        <th scope="row">
                          {cookie ? (
                            <>
                              <code className="ec-policy__cookie" title={cookie.pattern ? cookie.name : undefined}>
                                {cookie.displayName}
                              </code>
                              {cookie.domain && (
                                <>
                                  {' '}
                                  <span className="ec-policy__domain">{cookie.domain}</span>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="ec-policy__none">{L.noCookie}</span>
                          )}
                        </th>
                        <td className="ec-policy__service">{service.label}</td>
                        <td className="ec-policy__provider">
                          {service.privacyUrl && /^(https?:|mailto:|\/|#)/i.test(service.privacyUrl.trim()) ? (
                            <a className="ec-policy__link" href={service.privacyUrl} rel="noopener noreferrer" target="_blank">
                              {service.provider || L.privacyPolicy}
                            </a>
                          ) : (
                            service.provider
                          )}
                        </td>
                        <td className="ec-policy__duration">{cookie?.duration ?? ''}</td>
                        <td className="ec-policy__purpose">{cookie?.description || service.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export { buildPolicyModel, type PolicyModel } from './model';
