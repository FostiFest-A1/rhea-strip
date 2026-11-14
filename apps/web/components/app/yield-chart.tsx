import { fmtApy } from "@rhea/sdk/pricing";
import { Card } from "@/components/ui/card";

export type ChartPoint = { id: number; apy: number };

type YieldChartProps = {
  points: ChartPoint[];
  underlying: number;
  tone: "pt" | "yt";
};

type Verdict = "cheap" | "pricey" | "fair";

const WIDTH = 640;
const HEIGHT = 272;
const PAD_L = 48;
const PAD_R = 132;
const PAD_T = 36;
const PAD_B = 56;
const FAIR_BAND = 0.0005;
const COLORS: Record<Verdict, string> = { cheap: "#5BE3A0", pricey: "#FFC857", fair: "#ffffffa6" };
const FONT = "var(--font-inter)";

function verdictOf(delta: number, tone: "pt" | "yt"): Verdict {
  if (Math.abs(delta) < FAIR_BAND) return "fair";
  const cheaper = tone === "yt" ? delta < 0 : delta > 0;
  return cheaper ? "cheap" : "pricey";
}

function fmtDelta(delta: number): string {
  const points = delta * 100;
  const sign = points > 0 ? "+" : points < 0 ? "−" : "";
  return `${sign}${Math.abs(points).toFixed(1)} pt`;
}

const VERDICT_LABEL: Record<Verdict, string> = { cheap: "Cheaper", pricey: "Pricier", fair: "Fair" };

export function YieldChart({ points, underlying, tone }: YieldChartProps) {
  const finite = points.filter((point) => Number.isFinite(point.apy));
  const maxGap = Math.max(...finite.map((point) => Math.abs(point.apy - underlying)), 0);
  const span = Math.max(maxGap * 2.1, underlying * 0.15, 0.005);
  const low = Math.max(underlying - span, 0);
  const high = underlying + span;
  const plotTop = PAD_T;
  const plotBottom = HEIGHT - PAD_B;
  const y = (value: number) => plotBottom - ((value - low) / (high - low)) * (plotBottom - plotTop);
  const left = PAD_L + 56;
  const right = WIDTH - PAD_R - 36;
  const x = (index: number) => (finite.length <= 1 ? (left + right) / 2 : left + (index / (finite.length - 1)) * (right - left));
  const lineY = y(underlying);
  const upperGood = tone === "pt";
  const upperColor = upperGood ? COLORS.cheap : COLORS.pricey;
  const lowerColor = upperGood ? COLORS.pricey : COLORS.cheap;
  const upperWord = upperGood ? "Cheaper" : "Pricier";
  const lowerWord = upperGood ? "Pricier" : "Cheaper";
  const entries = finite.map((point, index) => {
    const delta = point.apy - underlying;
    return { point, delta, verdict: verdictOf(delta, tone), cx: x(index), cy: y(point.apy) };
  });
  const cheaperCount = entries.filter((entry) => entry.verdict === "cheap").length;
  const summary = `Implied APY of ${finite.length} open offers against an underlying APY of ${fmtApy(underlying, 1)}; ${cheaperCount} priced cheaper than fair value`;
  const hint =
    tone === "yt"
      ? "Below the dashed line, a YT costs less than the yield it should earn. Above it, you pay extra for that yield."
      : "Above the dashed line, a PT locks in more than the underlying pays. Below it, you accept less for the same maturity.";

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-title font-medium text-fg">Implied APY vs underlying APY</h3>
        <p className="text-ui text-fg-50">{`${cheaperCount} of ${finite.length} ${finite.length === 1 ? "offer" : "offers"} priced cheaper than fair`}</p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-ui text-fg-65" aria-label="Legend">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: COLORS.cheap }} />
          Cheaper than fair
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: COLORS.pricey }} />
          Pricier than fair
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="w-5 border-t border-dashed border-fg-65" />
          Underlying APY of the mock token
        </li>
      </ul>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary} className="mt-4 h-auto w-full">
        <rect x={PAD_L} y={plotTop} width={WIDTH - PAD_R - PAD_L + 8} height={Math.max(lineY - plotTop, 0)} fill={upperColor} fillOpacity=".05" />
        <rect x={PAD_L} y={lineY} width={WIDTH - PAD_R - PAD_L + 8} height={Math.max(plotBottom - lineY, 0)} fill={lowerColor} fillOpacity=".05" />
        {[low, high].map((value) => (
          <g key={value}>
            <line x1={PAD_L} x2={WIDTH - PAD_R + 8} y1={y(value)} y2={y(value)} stroke="#ffffff14" />
            <text x={PAD_L - 8} y={y(value) + 4} textAnchor="end" fill="#ffffff66" fontSize="11" fontFamily={FONT}>
              {fmtApy(value, 1)}
            </text>
          </g>
        ))}
        <text x={WIDTH - PAD_R + 20} y={plotTop + 14} fill={upperColor} fillOpacity=".85" fontSize="11" fontFamily={FONT}>
          {`↑ ${upperWord}`}
        </text>
        <text x={WIDTH - PAD_R + 20} y={plotBottom - 6} fill={lowerColor} fillOpacity=".85" fontSize="11" fontFamily={FONT}>
          {`↓ ${lowerWord}`}
        </text>
        <line x1={PAD_L} x2={WIDTH - PAD_R + 8} y1={lineY} y2={lineY} stroke="#ffffffa6" strokeDasharray="5 5" />
        <rect x={WIDTH - PAD_R + 12} y={lineY - 12} width={PAD_R - 16} height="24" rx="12" fill="#ffffff1a" stroke="#ffffff42" />
        <text x={WIDTH - PAD_R + 12 + (PAD_R - 16) / 2} y={lineY + 4} textAnchor="middle" fill="#fff" fontSize="12" fontFamily={FONT}>
          {`Underlying ${fmtApy(underlying, 1)}`}
        </text>
        <line x1={PAD_L} x2={WIDTH - PAD_R + 8} y1={plotBottom + 8} y2={plotBottom + 8} stroke="#ffffff1a" />
        {entries.map(({ point, delta, verdict, cx, cy }) => {
          const color = COLORS[verdict];
          const above = cy <= lineY;
          const sign = above ? -1 : 1;
          const top = Math.min(cy, lineY);
          return (
            <g key={point.id}>
              <title>{`Offer #${point.id}: ${fmtApy(point.apy, 1)} implied APY, ${fmtDelta(delta)} vs underlying, ${VERDICT_LABEL[verdict].toLowerCase()} than fair value`}</title>
              <rect x={cx - 16} y={top} width="32" height={Math.abs(cy - lineY)} fill={color} fillOpacity=".14" rx="4" />
              <line x1={cx} x2={cx} y1={lineY} y2={cy} stroke={color} strokeWidth="2" strokeOpacity=".7" />
              <circle cx={cx} cy={cy} r="13" fill={color} fillOpacity=".16" />
              <circle cx={cx} cy={cy} r="7" fill={color} stroke="#000" strokeWidth="2" />
              <text x={cx} y={cy + sign * 24} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600" fontFamily={FONT}>
                {fmtApy(point.apy, 1)}
              </text>
              <text x={cx} y={cy + sign * 38} textAnchor="middle" fill={color} fontSize="11" fontFamily={FONT}>
                {fmtDelta(delta)}
              </text>
              <text x={cx} y={HEIGHT - 28} textAnchor="middle" fill="#ffffffa6" fontSize="12" fontFamily={FONT}>
                {`Offer #${point.id}`}
              </text>
              <text x={cx} y={HEIGHT - 12} textAnchor="middle" fill={color} fontSize="11" fontFamily={FONT}>
                {VERDICT_LABEL[verdict]}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-ui text-fg-50">{hint}</p>
    </Card>
  );
}
