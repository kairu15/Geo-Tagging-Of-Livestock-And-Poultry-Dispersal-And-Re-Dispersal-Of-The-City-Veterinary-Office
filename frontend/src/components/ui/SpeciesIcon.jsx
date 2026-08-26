/**
 * SpeciesIcon — Professional SVG animal silhouettes with color-coded backgrounds.
 *
 * Usage:
 *   <SpeciesIcon species="Goat" size="sm" />   // 24px, for tables/badges
 *   <SpeciesIcon species="Goat" size="md" />   // 32px, for cards
 *   <SpeciesIcon species="Goat" size="lg" />   // 48px, for detail pages
 *   <SpeciesIcon species="Goat" size="xl" />   // 64px, for hero sections
 */

const SPECIES_CONFIG = {
  Goat: {
    color: '#16a34a',
    bgLight: '#dcfce7',
    // Goat silhouette — curved horns, beard
    path: 'M12 3C9.5 3 7.5 5 7 7.2C5.3 7.8 4 9.4 4 11.5c0 1.4.6 2.6 1.6 3.4L5 20h2l.8-3.5c.7.2 1.3.3 2.2.3 1.5 0 2.8-.5 3.8-1.3.5.1 1 .1 1.5.1 3 0 5.5-2.2 5.5-5S15 6 12 6c-.7 0-1.4.1-2 .3C10.5 4.2 11.5 3 12 3zm-1 4.5a1 1 0 110-2 1 1 0 010 2z',
  },
  Cattle: {
    color: '#2563eb',
    bgLight: '#dbeafe',
    // Cattle silhouette — broad body, horns
    path: 'M4 8c0-1 .5-2 1.5-2.5L7 4h2l.5 1h3L13 4h2l1.5 1.5c1 .5 1.5 1.5 1.5 2.5v2c0 1.5-1 3-2.5 3.5V18h-2v-4.5C10.5 13 9.5 12 9.5 11H8.5c0 1-1 2-2.5 2.5V18h-2v-4.5C2.5 13 2 12 2 11V8zm3 1a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  },
  Swine: {
    color: '#dc2626',
    bgLight: '#fee2e2',
    // Swine silhouette — snout, round body
    path: 'M12 4c-2 0-3.5 1-4.5 2.5C6 7 4.5 8 4 9.5 3.2 11 3 12.5 3 14c0 2.5 2 4 4.5 4H17c2.5 0 4.5-1.5 4.5-4 0-1.5-.2-3-1-4.5-.5-1.5-2-2.5-3.5-3C15.5 5 14 4 12 4zm-2.5 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm5 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-5.5 5h6c.3 0 .5.2.5.5v1c0 .3-.2.5-.5.5h-6c-.3 0-.5-.2-.5-.5v-1c0-.3.2-.5.5-.5z',
  },
  Chicken: {
    color: '#f59e0b',
    bgLight: '#fef3c7',
    // Chicken silhouette — body, comb, beak
    path: 'M10 3c0 0-1 1-1 2 0 .5.2 1 .5 1.3C7.5 7 6 9 6 11c0 1.5.5 3 1.5 4l-1 4h2l1-3c.6.1 1.3.2 2 .2 3 0 5.5-1.5 6.5-4 .3-.8.5-1.6.5-2.5 0-2-1.5-3.5-3.5-4l-.5-1.5c-.3-.5-.5-1-1-1.2-.5-.2-1-.5-1-.5zM8.5 10a1.5 1.5 0 110 3 1.5 1.5 0 010-3z',
  },
  Duck: {
    color: '#8b5cf6',
    bgLight: '#ede9fe',
    // Duck silhouette — flat bill, rounded body
    path: 'M5 7c0-1 .5-2 1.5-2.5.5-.3 1-.5 1.5-.5 1 0 2 .5 2.5 1.5.5-.3 1.2-.5 2-.5 2 0 3.5 1.5 3.5 3.5 0 1-.5 2-1 2.5v4.5h-2V12H9v3H7V10c-1-.5-2-1.5-2-3zm2 1a1.5 1.5 0 110 3 1.5 1.5 0 010-3z',
  },
  default: {
    color: '#6b7280',
    bgLight: '#f3f4f6',
    // Generic paw/animal silhouette
    path: 'M12 4c-1.5 0-3 1-3 2.5S10.5 9 12 9s3-.5 3-2.5S13.5 4 12 4zM7 11c-1 0-2 .8-2 2s1 2 2 2 2-.8 2-2-1-2-2-2zm10 0c-1 0-2 .8-2 2s1 2 2 2 2-.8 2-2-1-2-2-2zM9 16c-1 0-2 .8-2 2s1 2 2 2 2-.8 2-2-1-2-2-2zm6 0c-1 0-2 .8-2 2s1 2 2 2 2-.8 2-2-1-2-2-2z',
  },
};

const SIZES = {
  sm: { container: 28, icon: 16, border: 2 },
  md: { container: 36, icon: 20, border: 2 },
  lg: { container: 52, icon: 28, border: 3 },
  xl: { container: 72, icon: 38, border: 3 },
};

export default function SpeciesIcon({ species, size = 'md', className = '' }) {
  const config = SPECIES_CONFIG[species] || SPECIES_CONFIG.default;
  const dims = SIZES[size] || SIZES.md;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl ${className}`}
      style={{
        width: dims.container,
        height: dims.container,
        backgroundColor: config.bgLight,
        border: `${dims.border}px solid ${config.color}18`,
      }}
      aria-label={species || 'Unknown species'}
    >
      <svg
        width={dims.icon}
        height={dims.icon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d={config.path}
          fill={config.color}
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

/**
 * Returns a Leaflet-compatible DivIcon HTML string with a colored dot for map markers.
 * Keeps the existing map marker approach but uses colored circles instead of emojis.
 */
export function getSpeciesDotColor(species) {
  return SPECIES_CONFIG[species]?.color || SPECIES_CONFIG.default.color;
}

export { SPECIES_CONFIG };
