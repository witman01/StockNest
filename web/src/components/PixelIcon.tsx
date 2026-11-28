/**
 * Small pixel glyphs in the same dot language as the hero mountain.
 * 9×9 grids: "x" = deep cornflower, "o" = light cornflower, "." = empty.
 */
const GLYPHS = {
  child: [
    "..xxxxx..",
    ".x.....x.",
    "x.......x",
    "x.x...x.x",
    "x.......x",
    "x.o...o.x",
    "x..xxx..x",
    ".x.....x.",
    "..xxxxx..",
  ],
  chart: [
    "........x",
    "......o.x",
    "......o.x",
    "....o.o.x",
    "....o.o.x",
    "..o.o.o.x",
    "..o.o.o.x",
    "o.o.o.o.x",
    "xxxxxxxxx",
  ],
  calendar: [
    ".x.....x.",
    "xxxxxxxxx",
    "x.......x",
    "x.o.o.o.x",
    "x.......x",
    "x.o.x.o.x",
    "x.......x",
    "x.o.o.o.x",
    "xxxxxxxxx",
  ],
  note: [
    "xxxxxxxxx",
    "x.......x",
    "x.ooooo.x",
    "x.......x",
    "x.ooo...x",
    "x.......x",
    "xxxxxxxxx",
    "..xx.....",
    "..x......",
  ],
  gift: [
    "..x...x..",
    "...x.x...",
    "xxxxxxxxx",
    "x...x...x",
    "xxxxxxxxx",
    ".o..x..o.",
    ".o..x..o.",
    ".o..x..o.",
    ".xxxxxxx.",
  ],
  bolt: [
    ".....xx..",
    "....xx...",
    "...xx....",
    "..xxxxxx.",
    "....oxx..",
    "...oxx...",
    "..oxx....",
    "..xx.....",
    ".x.......",
  ],
} as const;

export type PixelName = keyof typeof GLYPHS;

export function PixelIcon({ name, size = 20, tone = "blue", className }: { name: PixelName; size?: number; tone?: "blue" | "white"; className?: string }) {
  const dark = tone === "white" ? "#FFFFFF" : "#1F4FD1";
  const light = tone === "white" ? "rgba(255,255,255,.6)" : "#8FB2FF";
  return (
    <svg viewBox="0 0 9 9" width={size} height={size} className={className} aria-hidden="true" shapeRendering="crispEdges">
      {GLYPHS[name].flatMap((row, y) => row.split("").map((c, x) =>
        c === "." ? null : <rect key={`${x}-${y}`} x={x + 0.08} y={y + 0.08} width=".84" height=".84" fill={c === "x" ? dark : light} />,
      ))}
    </svg>
  );
}
