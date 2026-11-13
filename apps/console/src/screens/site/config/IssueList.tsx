import type { ConfigIssue } from '../../../api/types';
import { useI18n } from '../../../i18n';
import type { Dict } from '../../../i18n/it';

export type TabKey = 'categories' | 'services' | 'texts' | 'gcm' | 'ui' | 'cookie' | 'json';

/** Which editor tab owns an issue path. */
export function tabForPath(path: string): TabKey {
  const head = path.split(/[.[]/)[0];
  switch (head) {
    case 'categories':
      return 'categories';
    case 'services':
      return 'services';
    case 'texts':
      return 'texts';
    case 'googleConsentMode':
      return 'gcm';
    case 'ui':
      return 'ui';
    case 'revision':
    case 'expiryDays':
    case 'cookie':
    case 'language':
    case 'policyUrl':
    case 'respectGpc':
      return 'cookie';
    default:
      return 'json';
  }
}

type IssueKey = Exclude<keyof Dict['config']['issueMessages'], 'unknownSignal'>;

/**
 * Known `validateConfig` messages (packages/core/src/shared/config.ts),
 * matched by path pattern + exact English message.
 */
const ISSUE_RULES: { path: RegExp; message: string; key: IssueKey }[] = [
  { path: /^$/, message: 'Config must be an object', key: 'notObjectConfig' },
  { path: /^revision$/, message: 'Required non-empty string', key: 'revisionRequired' },
  { path: /^expiryDays$/, message: 'Must be a number between 1 and 395 (13 months)', key: 'expiryRange' },
  { path: /^categories$/, message: 'At least one category is required', key: 'categoriesRequired' },
  { path: /^categories$/, message: 'Declare a readOnly category for strictly necessary cookies', key: 'readOnlyRequired' },
  { path: /^categories\.[^.]+$/, message: 'Category id must be alphanumeric (a-z, 0-9, _ and -)', key: 'categoryIdInvalid' },
  { path: /^(categories|services)(\.[^.]+)?$/, message: 'Must be an object', key: 'mustBeObject' },
  { path: /^categories\.[^.]+\.(title|description)$/, message: 'Must be a string or a language map', key: 'mustBeLocalized' },
  { path: /^(categories\.[^.]+\.gcm|services\.[^.]+\.cookies)$/, message: 'Must be an array', key: 'mustBeArray' },
  { path: /^services\.[^.]+\.category$/, message: 'Must reference a declared category', key: 'categoryReference' },
  { path: /^services\.[^.]+\.cookies\.\d+\.name$/, message: 'Required', key: 'required' },
  { path: /^services\.[^.]+\.cookies\.\d+\.name$/, message: 'Invalid regular expression', key: 'invalidRegex' },
  { path: /^services\.[^.]+\.privacyUrl$/, message: 'Must be a URL string', key: 'urlString' },
  { path: /^log$/, message: 'Requires endpoint and siteKey strings', key: 'logRequires' },
  { path: /^cookie\.secure$/, message: 'SameSite=None requires secure', key: 'sameSiteSecure' },
  { path: /^language\.default$/, message: 'Required string', key: 'languageDefault' },
];

const UNKNOWN_SIGNAL = /^Unknown Consent Mode signal "(.*)"$/;

/** Localize a core validator message; unknown messages pass through unchanged. */
export function issueMessage(issue: ConfigIssue, t: Dict): string {
  const m = t.config.issueMessages;
  const rule = ISSUE_RULES.find((r) => r.message === issue.message && r.path.test(issue.path));
  if (rule) return m[rule.key];
  const sig = /^categories\.[^.]+\.gcm\.\d+$/.test(issue.path) ? UNKNOWN_SIGNAL.exec(issue.message) : null;
  if (sig) return m.unknownSignal(sig[1]);
  return issue.message;
}

export function IssueList({ issues, onSelect }: { issues: ConfigIssue[]; onSelect?: (issue: ConfigIssue) => void }) {
  const { t } = useI18n();
  return (
    <ul className="issues">
      {issues.map((i, n) => (
        <li key={`${i.path}-${n}`}>
          {onSelect ? (
            <button type="button" className="issue-path" onClick={() => onSelect(i)}>
              {i.path || t.config.issueRoot}
            </button>
          ) : (
            <code className="issue-path">{i.path || t.config.issueRoot}</code>
          )}
          <span>{issueMessage(i, t)}</span>
        </li>
      ))}
    </ul>
  );
}
