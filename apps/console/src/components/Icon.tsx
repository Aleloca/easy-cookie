/** Authored icon set: 16px grid, 1.5px square-capped stroke, matching the square-cornered Libretto world. */
const PATHS = {
  chevronDown: 'M4 6.5l4 4 4-4',
  chevronRight: 'M6.5 4l4 4-4 4',
  chevronLeft: 'M9.5 4l-4 4 4 4',
  book: 'M3 2.5h8.5v11H3zM5.5 2.5v11M7.5 5.5h2.5M7.5 8h2.5',
  doc: 'M3.5 2.5h6l3 3v8h-9zM9.5 2.5v3h3M5.5 8.5h5M5.5 11h5',
  menu: 'M2.5 4.5h11M2.5 8h11M2.5 11.5h11',
  close: 'M4 4l8 8M12 4l-8 8',
  plus: 'M8 3v10M3 8h10',
  copy: 'M5.5 5.5h7v7h-7zM10.5 5.5v-2h-7v7h2',
  check: 'M3 8.5l3 3 7-7',
  download: 'M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10',
  search: 'M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM10.3 10.3l3.2 3.2',
  alert: 'M8 2.5l6 11H2zM8 6.5v3.5M8 11.5v.5',
  refresh: 'M13 8a5 5 0 1 1-1.5-3.6M13 2.5v2.5h-2.5',
  trash: 'M3 4.5h10M6.5 4.5v-2h3v2M4.5 4.5l.5 9h6l.5-9',
  external: 'M9.5 2.5h4v4M13.5 2.5L8 8M11.5 9.5v4h-9v-9h4',
  filter: 'M2.5 3.5h11M4.5 8h7M6.5 12.5h3',
  logout: 'M6.5 2.5h-4v11h4M10 5l3 3-3 3M13 8H6',
  stamp: 'M3 13.5h10M4 11h8V8.5H4zM6.5 8.5V6a1.5 1.5 0 1 1 3 0v2.5',
  key: 'M2.5 8a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0zM7.5 8h6M11 8v2.5M13.5 8v2',
  eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  diff: 'M5 2.5v7M2.5 5h5M9.5 11.5h4M10.5 4.5l3 3-3 3',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
