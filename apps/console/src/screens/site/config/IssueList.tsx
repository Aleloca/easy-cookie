import type { ConfigIssue } from '../../../api/types';

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

export function IssueList({ issues, onSelect }: { issues: ConfigIssue[]; onSelect?: (issue: ConfigIssue) => void }) {
  return (
    <ul className="issues">
      {issues.map((i, n) => (
        <li key={`${i.path}-${n}`}>
          {onSelect ? (
            <button type="button" className="issue-path" onClick={() => onSelect(i)}>
              {i.path || '(root)'}
            </button>
          ) : (
            <code className="issue-path">{i.path || '(root)'}</code>
          )}
          <span>{i.message}</span>
        </li>
      ))}
    </ul>
  );
}
