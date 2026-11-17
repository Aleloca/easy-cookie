import { useId } from 'react';

/**
 * Brand mark: a padlock whose body is a consent line (one category granted,
 * two denied), with a bite taken out of the corner. Drawn in currentColor;
 * the cut-outs show the background, the check is green.
 */
export function BrandMark({ size = 22 }: { size?: number }) {
  const id = `ec-mark-${useId().replace(/:/g, '')}`;
  return (
    <svg
      className="brand-mark"
      width={Math.round((size * 200) / 237)}
      height={size}
      viewBox="28 3 200 237"
      aria-hidden="true"
      focusable="false"
    >
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
        <rect width="256" height="256" fill="#fff" />
        <rect x="54" y="126" width="40" height="40" fill="#000" />
        <rect x="112.3" y="130.3" width="31.4" height="31.4" fill="none" stroke="#000" strokeWidth="8.6" />
        <rect x="166.3" y="130.3" width="31.4" height="31.4" fill="none" stroke="#000" strokeWidth="8.6" />
        <path d="M54 196H202" stroke="#000" strokeWidth="8.6" />
        <circle cx="232" cy="244" r="48" fill="#000" />
        <circle cx="184" cy="238" r="15" fill="#000" />
        <circle cx="226" cy="196" r="15" fill="#000" />
      </mask>
      <g fill="currentColor" stroke="currentColor" mask={`url(#${id})`}>
        <path d="M80 104V62a48 48 0 0 1 96 0V104" fill="none" strokeWidth="22" />
        <rect x="28" y="100" width="200" height="140" stroke="none" />
      </g>
      <path d="M63 146.5l8.5 8.5 15-17" fill="none" stroke="#8fc9a6" strokeWidth="7" strokeLinecap="square" />
    </svg>
  );
}
