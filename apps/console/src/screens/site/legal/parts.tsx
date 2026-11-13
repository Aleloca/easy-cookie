import { useState } from 'react';
import type { Localized } from '@easy-cookie/core/shared';
import { drafts } from '../../../api/endpoints';
import type { LegalKind } from '../../../api/types';
import { Icon } from '../../../components/Icon';
import { Button, CopyBlock, errorMessage, RevisionNotice } from '../../../components/ui';
import { useI18n } from '../../../i18n';
import { legalHostedUrl, legalHtmlSnippet, legalNextSnippet } from '../../../lib/legal';
import { useResource } from '../../../lib/hooks';
import { serverOrigin } from '../../../lib/snippets';

/** True when every language of the banner's policy link points at `url`. */
export function linksTo(policyUrl: Localized | undefined, url: string): boolean {
  if (!policyUrl) return false;
  const values = typeof policyUrl === 'string' ? [policyUrl] : Object.values(policyUrl);
  return values.length > 0 && values.every((v) => v === url || v.startsWith(`${url}?`));
}

/**
 * One click to make the hosted cookie policy the banner's policy link: reads the
 * banner draft, sets `policyUrl` and saves it with the regular draft PUT.
 */
export function UseAsBannerLink({ siteId, publicKey }: { siteId: string; publicKey: string }) {
  const { t, lang } = useI18n();
  const url = legalHostedUrl(serverOrigin(), publicKey, 'cookie');
  const draft = useResource(() => drafts.get(siteId), [siteId]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const current = draft.data?.config.policyUrl;
  const already = linksTo(current, url);
  const currentText = current === undefined ? null : typeof current === 'string' ? current : (current[lang] ?? Object.values(current)[0]);

  const apply = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const fresh = await drafts.get(siteId);
      const saved = await drafts.save(siteId, { ...fresh.config, policyUrl: url });
      draft.setData(saved);
      setMsg({ ok: true, text: t.legal.bannerLinkSet });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e, t) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="banner-link">
      <div className="row">
        <Button variant="ghost" icon="external" onClick={apply} busy={busy} disabled={already || !draft.data}>
          {t.legal.useAsBannerLink}
        </Button>
        {msg ? (
          <span className={msg.ok ? 'ok-msg' : 'field-error'} role="status">
            {msg.text}
          </span>
        ) : already ? (
          <span className="ok-msg" role="status">
            <Icon name="check" /> {t.legal.bannerLinkAlready}
          </span>
        ) : null}
      </div>
      {draft.data && !already && (
        <p className="hint">{currentText ? t.legal.bannerLinkCurrent(currentText) : t.legal.bannerLinkNone}</p>
      )}
    </div>
  );
}

/** "Come usarlo": hosted URL, the legal.js snippet and the Next.js snippet. */
export function EmbedPanel({
  kind,
  siteId,
  publicKey,
  lang,
  published,
}: {
  kind: LegalKind;
  siteId: string;
  publicKey: string;
  lang: string;
  published: boolean;
}) {
  const { t } = useI18n();
  const origin = serverOrigin();
  const url = legalHostedUrl(origin, publicKey, kind);
  return (
    <div className="embed">
      {!published && <RevisionNotice tone="ink">{t.legal.beforePublish}</RevisionNotice>}
      <section className="section" aria-labelledby="embed-hosted-h">
        <h2 id="embed-hosted-h" className="section-title">
          {t.legal.hosted}
        </h2>
        <CopyBlock label={t.legal.hosted} value={url} hint={t.legal.hostedHint} hideLabel />
        {published && (
          <a className="link link-ext" href={url} target="_blank" rel="noreferrer noopener">
            {t.legal.open}
            <Icon name="external" size={14} />
          </a>
        )}
        {kind === 'cookie' && <UseAsBannerLink siteId={siteId} publicKey={publicKey} />}
      </section>
      <section className="section" aria-labelledby="embed-snip-h">
        <h2 id="embed-snip-h" className="section-title">
          {t.keys.snippets}
        </h2>
        <div className="snippets">
          <CopyBlock label={t.legal.snippetHtml} value={legalHtmlSnippet(origin, publicKey, kind)} hint={t.legal.snippetHtmlHint} multiline />
          <CopyBlock label={t.legal.snippetNext} value={legalNextSnippet(origin, publicKey, kind, lang)} hint={t.legal.snippetNextHint} multiline />
        </div>
      </section>
    </div>
  );
}
