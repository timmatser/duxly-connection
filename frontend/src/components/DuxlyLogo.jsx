/**
 * Duxly Logo component
 * Renders the Duxly brand logo as an inline SVG
 */
function DuxlyLogo({ width = 120, height = 40 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Duxly logo"
    >
      {/* Logo mark - stylized "D" with connection lines */}
      <rect x="4" y="8" width="24" height="24" rx="4" fill="#4F46E5" />
      <path
        d="M12 14h8c2.2 0 4 1.8 4 4v4c0 2.2-1.8 4-4 4h-8V14z"
        fill="#818CF8"
      />
      <circle cx="20" cy="20" r="3" fill="white" />

      {/* Wordmark "duxly" */}
      <text
        x="36"
        y="26"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="18"
        fontWeight="700"
        fill="#1F2937"
      >
        duxly
      </text>
    </svg>
  );
}

export default DuxlyLogo;
