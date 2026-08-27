export function AbaaMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 72"
      className={className}
      role="img"
      aria-label="Air Barrier Association of America"
    >
      <rect width="280" height="72" rx="8" fill="#1b365d" />
      <text
        x="14"
        y="22"
        fill="#f6f3ec"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="11"
      >
        air barrier
      </text>
      <text
        x="14"
        y="38"
        fill="#f6f3ec"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="11"
      >
        association of
      </text>
      <text
        x="14"
        y="54"
        fill="#f6f3ec"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="11"
      >
        america
      </text>
      <text
        x="168"
        y="50"
        fill="#f6f3ec"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="36"
        fontWeight="700"
      >
        abaa
      </text>
    </svg>
  );
}
