const AVATAR_COLORS = [
  ['#1e3a8a', '#3b82f6'],
  ['#0f766e', '#14b8a6'],
  ['#4338ca', '#818cf8'],
  ['#475569', '#94a3b8'],
  ['#155e75', '#22d3ee'],
  ['#5b21b6', '#a78bfa'],
];

const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const getInitials = name => {
  const words = String(name || 'Colaborador').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'C';
  return `${words[0][0] || ''}${words.length > 1 ? words[words.length - 1][0] : ''}`.toUpperCase();
};

const stableNumber = value => Array.from(String(value || 'avatar'))
  .reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);

export const getAvatarUrl = (name, id) => {
  const initials = escapeXml(getInitials(name));
  const [startColor, endColor] = AVATAR_COLORS[stableNumber(`${id}-${name}`) % AVATAR_COLORS.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${initials}">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${startColor}"/>
          <stop offset="1" stop-color="${endColor}"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="20" fill="url(#background)"/>
      <circle cx="76" cy="20" r="20" fill="#ffffff" fill-opacity="0.08"/>
      <text x="48" y="51" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" text-anchor="middle" dominant-baseline="middle">${initials}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
