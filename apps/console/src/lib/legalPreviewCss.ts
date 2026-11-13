/**
 * Base styles for the legal preview, inside its shadow root. The server's own
 * `/static/easy-cookie-legal.css` is linked after this sheet and wins where it
 * applies; these rules keep the preview readable in mock mode (no server) and
 * paint the placeholder marks, which must stand out in the editor whatever the
 * public stylesheet does with them.
 */
export const LEGAL_PREVIEW_CSS = `
:host { display: block; color: #1b1d22; font: 14.5px/1.6 'Helvetica Neue', Helvetica, Arial, sans-serif; }
.ec-legal { max-width: 68ch; }
.ec-legal > * + * { margin-top: .75em; }
.ec-legal h1, .ec-legal__title { font-size: 22px; font-weight: 700; letter-spacing: -.015em; line-height: 1.2; margin: 0 0 .7em; text-wrap: balance; }
.ec-legal h2 { font-size: 17px; font-weight: 600; margin-top: 1.4em; }
.ec-legal h3 { font-size: 15px; font-weight: 600; margin-top: 1.1em; }
.ec-legal p, .ec-legal ul, .ec-legal ol { margin-bottom: 0; }
.ec-legal ul, .ec-legal ol { padding-left: 1.3em; }
.ec-legal ul { list-style: square; }
.ec-legal li + li { margin-top: .3em; }
.ec-legal a { color: #1e2f5a; text-underline-offset: 3px; }
.ec-legal table { border-collapse: collapse; width: 100%; font-size: 12.5px; border: 1px solid #c9d0c6; margin: 6px 0 10px; }
.ec-legal th { text-align: left; font-weight: 600; padding: 6px 8px; border-bottom: 2px solid #c9d0c6; background: #f6f7f5; }
.ec-legal td { padding: 6px 8px; border-bottom: 1px solid #e3e6e0; vertical-align: top; }
.ec-legal code { font: 12px 'SF Mono', ui-monospace, Menlo, Consolas, monospace; }
`;

/** Appended after the server sheet: the editor's highlight for `[[…]]` always wins. */
export const LEGAL_PREVIEW_MARKS_CSS = `
mark.ec-legal__todo, mark.ph { background: #f6e3b4; color: #5c3a00; padding: 0 3px; border-radius: 0; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
`;
