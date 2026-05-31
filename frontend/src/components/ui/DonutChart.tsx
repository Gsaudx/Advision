export interface DonutSegment {
  key: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  total: number;
  centerLine1: string | number;
  centerLine2?: string;
  size?: number;
  thickness?: number;
}

// Renders an SVG donut chart. Each segment is drawn using stroke-dasharray/offset.
// Starts at 12 o'clock via a -90° rotation on the circle group.
export function DonutChart({
  segments,
  total,
  centerLine1,
  centerLine2,
  size = 120,
  thickness = 11,
}: DonutChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  const GAP =
    total > 0 && segments.filter((s) => s.value > 0).length > 1 ? 4 : 0;

  const filtered = segments.filter((s) => s.value > 0);
  const arcs = filtered.map((seg) => (seg.value / total) * circumference);
  const drawn = filtered.map((seg, i) => ({
    ...seg,
    dashLength: Math.max(0, arcs[i] - GAP),
    dashOffset: -arcs.slice(0, i).reduce((sum, a) => sum + a, 0),
  }));

  const line1Size = size * 0.23;
  const line2Size = size * 0.115;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-surface-container-high"
        strokeWidth={thickness}
      />
      {/* Segments */}
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {drawn.map((seg) => (
          <circle
            key={seg.key}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${seg.dashLength} ${circumference}`}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="butt"
          />
        ))}
      </g>
      {/* Center: primary value */}
      <text
        x={cx}
        y={centerLine2 ? cy - line2Size * 0.4 : cy + line1Size * 0.35}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        className="text-on-surface"
        style={{ fontSize: line1Size, fontWeight: 800, fontFamily: 'inherit' }}
      >
        {centerLine1}
      </text>
      {/* Center: secondary label */}
      {centerLine2 && (
        <text
          x={cx}
          y={cy + line1Size * 0.6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          className="text-on-surface-variant"
          style={{
            fontSize: line2Size,
            fontWeight: 500,
            fontFamily: 'inherit',
          }}
        >
          {centerLine2}
        </text>
      )}
    </svg>
  );
}
