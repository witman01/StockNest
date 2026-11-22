/**
 * The StockNest family: Grandpa, Grandma, Dad, Amelia, Mum, cousin Zara,
 * Uncle James and Biscuit the dog, gathered around a nest that grows a share.
 *
 * Everything is flat vector in the brand palette. Each character is drawn in
 * local coordinates (x = 0 is their centre, y = 0 is the ground) and placed
 * with translate(). Idle animations are pure CSS (see globals.css).
 */

const INK = "#1F2A2E";
const BLUSH = "#E9958A";
const FOREST = "#0C513F";
const FOREST_DK = "#083B2E";
const HONEY = "#F2B34A";
const SAGE = "#4E8F86";
const SKY = "#8FB8D8";
const GROUND = 470;

function Share({ x, y, s = 24, className, style }: { x: number; y: number; s?: number; className?: string; style?: React.CSSProperties }) {
  const k = s / 24;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <g className={className} style={style}>
        <circle cx="11" cy="13" r="10" fill={HONEY} />
        <path d="M11 13V3A10 10 0 0 1 21 13Z" fill="#FCEFD3" />
        <path d="M13 11V1A10 10 0 0 1 23 11Z" fill={FOREST} />
      </g>
    </g>
  );
}

function Heart({ x, y, s = 18, fill = HONEY, className, style }: { x: number; y: number; s?: number; fill?: string; className?: string; style?: React.CSSProperties }) {
  const k = s / 16;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path className={className} style={style} fill={fill} d="M8 15C8 15 0 10 0 4.6 0 2 2 0 4.4 0 6 0 7.3.9 8 2.2 8.7.9 10 0 11.6 0 14 0 16 2 16 4.6 16 10 8 15 8 15Z" />
    </g>
  );
}

function Spark({ x, y, s = 18, fill = HONEY, delay = 0 }: { x: number; y: number; s?: number; fill?: string; delay?: number }) {
  const k = s / 20;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path className="fs-twinkle" style={{ animationDelay: `${delay}s` }} fill={fill} d="M10 0C11 7 13 9 20 10 13 11 11 13 10 20 9 13 7 11 0 10 7 9 9 7 10 0Z" />
    </g>
  );
}

const Eyes = ({ l, r, y, rad = 2.6 }: { l: number; r: number; y: number; rad?: number }) => (
  <g className="fs-blink" style={{ animationDelay: `${(l * 7) % 3}s` }}>
    <circle cx={l} cy={y} r={rad} fill={INK} /><circle cx={r} cy={y} r={rad} fill={INK} />
  </g>
);
const Cheeks = ({ l, r, y, rad = 4 }: { l: number; r: number; y: number; rad?: number }) => (
  <><circle cx={l} cy={y} r={rad} fill={BLUSH} opacity=".45" /><circle cx={r} cy={y} r={rad} fill={BLUSH} opacity=".45" /></>
);

function Grandpa() {
  const skin = "#D9A27E", cardi = "#3E5A73";
  return (
    <g className="fs-breathe" style={{ animationDelay: "-1.2s" }}>
      <path d="M-24 -112H24L22 -2H4L0 -74-4 -2H-22Z" fill="#55625F" />
      <ellipse cx="-13" cy="0" rx="13" ry="5.5" fill={INK} /><ellipse cx="13" cy="0" rx="13" ry="5.5" fill={INK} />
      <path d="M-28 -196Q-42 -156-36 -126" stroke={cardi} strokeWidth="16" fill="none" strokeLinecap="round" />
      <circle cx="-36" cy="-120" r="8.5" fill={skin} />
      <path d="M-34 -108V-176Q-34 -230 0 -230T34 -176V-108Z" fill={cardi} />
      <path d="M-11 -229L0 -208 11 -229Z" fill="#FBF7F0" />
      <circle cx="-4" cy="-180" r="2.4" fill="#FBF7F0" /><circle cx="-4" cy="-160" r="2.4" fill="#FBF7F0" /><circle cx="-4" cy="-140" r="2.4" fill="#FBF7F0" />
      <rect x="-8" y="-250" width="16" height="24" rx="7" fill={skin} />
      <circle cx="0" cy="-268" r="25" fill={skin} />
      <ellipse cx="-22" cy="-264" rx="6" ry="10" fill="#E8E4DE" /><ellipse cx="22" cy="-264" rx="6" ry="10" fill="#E8E4DE" />
      <path d="M-27 -274Q-26 -300 0 -300Q24 -300 27 -278Z" fill="#55625F" />
      <path d="M12 -278Q34 -282 40 -272Q24 -270 12 -274Z" fill="#3F4A47" />
      <Eyes l={-9} r={9} y={-265} />
      <Cheeks l={-16} r={16} y={-257} />
      <path d="M-11 -253Q0 -260 11 -253Q0 -247-11 -253Z" fill="#E8E4DE" />
      <path d="M30 -196Q46 -160 42 -128" stroke={cardi} strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d="M45 -124V-2" stroke="#8A5C33" strokeWidth="5" strokeLinecap="round" />
      <path d="M45 -124Q45 -138 57 -134" stroke="#8A5C33" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="42" cy="-122" r="8.5" fill={skin} />
    </g>
  );
}

function Grandma() {
  const skin = "#F1C6A5", cardi = "#9CCBB7";
  return (
    <g className="fs-breathe" style={{ animationDelay: "-2.4s" }}>
      <rect x="-18" y="-36" width="10" height="32" rx="4" fill={skin} /><rect x="8" y="-36" width="10" height="32" rx="4" fill={skin} />
      <ellipse cx="-14" cy="0" rx="12" ry="5.5" fill="#55625F" /><ellipse cx="14" cy="0" rx="12" ry="5.5" fill="#55625F" />
      <path d="M-32 -112H32L42 -28H-42Z" fill="#7A5446" />
      <path d="M-28 -168Q-42 -134-34 -108" stroke={cardi} strokeWidth="15" fill="none" strokeLinecap="round" />
      <circle cx="-33" cy="-103" r="8" fill={skin} />
      <path d="M-34 -102V-148Q-34 -190 0 -190T34 -148V-102Z" fill={cardi} />
      <path d="M0 -182V-104" stroke={SAGE} strokeWidth="2" />
      <circle cx="5" cy="-162" r="2.6" fill={FOREST} /><circle cx="5" cy="-142" r="2.6" fill={FOREST} /><circle cx="5" cy="-122" r="2.6" fill={FOREST} />
      <rect x="-8" y="-210" width="16" height="24" rx="7" fill={skin} />
      <circle cx="0" cy="-260" r="14" fill="#D9D4CF" />
      <circle cx="0" cy="-228" r="26" fill={skin} />
      <path d="M-26 -230Q-26 -254 0 -254T26 -230Q14 -243 0 -243T-26 -230Z" fill="#D9D4CF" />
      <circle cx="-10" cy="-226" r="7.5" fill="none" stroke={INK} strokeWidth="2" /><circle cx="10" cy="-226" r="7.5" fill="none" stroke={INK} strokeWidth="2" />
      <path d="M-2.5 -226H2.5" stroke={INK} strokeWidth="2" />
      <Eyes l={-10} r={10} y={-226} rad={2.2} />
      <Cheeks l={-17} r={17} y={-215} />
      <path d="M-7 -213Q0 -207 7 -213" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M30 -168Q54 -144 68 -124" stroke={cardi} strokeWidth="15" fill="none" strokeLinecap="round" />
      <g transform="rotate(-10 78 -124)">
        <rect x="60" y="-140" width="38" height="30" rx="5" fill="#FFFFFF" />
        <Share x={69} y={-135} s={20} />
      </g>
      <circle cx="69" cy="-119" r="7.5" fill={skin} />
    </g>
  );
}

function Dad() {
  const skin = "#8D5A3B";
  return (
    <g className="fs-breathe" style={{ animationDelay: "-0.6s" }}>
      <path d="M-30 -122H30L26 -2H5L0 -84-5 -2H-26Z" fill={INK} />
      <ellipse cx="-16" cy="0" rx="15" ry="6" fill="#55625F" /><ellipse cx="16" cy="0" rx="15" ry="6" fill="#55625F" />
      <path d="M-34 -226Q-52 -178-46 -138" stroke={FOREST} strokeWidth="18" fill="none" strokeLinecap="round" />
      <circle cx="-46" cy="-132" r="9" fill={skin} />
      <path d="M-40 -118V-190Q-40 -248 0 -248T40 -190V-118Z" fill={FOREST} />
      <path d="M-14 -246Q0 -230 14 -246" fill={FOREST_DK} />
      <rect x="-10" y="-270" width="20" height="26" rx="8" fill={skin} />
      <circle cx="0" cy="-292" r="28" fill={skin} />
      <path d="M-28 -294Q-30 -324 0 -324T28 -296Q16 -310 0 -308-18 -308-28 -294Z" fill={INK} />
      <Eyes l={-10} r={10} y={-289} rad={2.7} />
      <Cheeks l={-17} r={17} y={-280} rad={4.2} />
      <path d="M-8 -278Q0 -271 8 -278" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M34 -226Q52 -178 46 -138" stroke={FOREST} strokeWidth="18" fill="none" strokeLinecap="round" />
      <circle cx="46" cy="-132" r="9" fill={skin} />
    </g>
  );
}

function Mum() {
  const skin = "#C68A62", hair = "#4A2F22";
  return (
    <g className="fs-breathe" style={{ animationDelay: "-3s" }}>
      <path d="M-30 -272Q-32 -314 0 -314T30 -272L38 -200Q0 -188-38 -200Z" fill={hair} />
      <path d="M-34 -114H34L38 -2H14L0 -80-14 -2H-38Z" fill="#3E5A73" />
      <ellipse cx="-26" cy="0" rx="14" ry="6" fill={FOREST} /><ellipse cx="26" cy="0" rx="14" ry="6" fill={FOREST} />
      <path d="M34 -212Q52 -170 46 -136" stroke={HONEY} strokeWidth="17" fill="none" strokeLinecap="round" />
      <circle cx="46" cy="-130" r="8.5" fill={skin} />
      <path d="M-38 -110V-178Q-38 -234 0 -234T38 -178V-110Z" fill={HONEY} />
      <rect x="-9" y="-256" width="18" height="26" rx="7" fill={skin} />
      <circle cx="0" cy="-278" r="26" fill={skin} />
      <path d="M-26 -280Q-24 -306 0 -306T26 -282Q10 -294-10 -290-22 -288-26 -280Z" fill={hair} />
      <Eyes l={-9} r={9} y={-275} />
      <Cheeks l={-16} r={16} y={-267} />
      <path d="M-7 -265Q0 -259 7 -265" stroke={INK} strokeWidth="2.3" fill="none" strokeLinecap="round" />
      <circle cx="-25" cy="-268" r="3" fill={FOREST} />
      <path d="M-34 -212Q-52 -170-46 -136" stroke={HONEY} strokeWidth="17" fill="none" strokeLinecap="round" />
      <circle cx="-46" cy="-130" r="8.5" fill={skin} />
    </g>
  );
}

function Amelia() {
  const skin = "#A8704C", hair = "#2A1A12";
  return (
    <g className="amelia-walk">
      <ellipse cx="0" cy="2" rx="24" ry="4" fill="#000" opacity=".1" />
      <g className="leg-a"><rect x="-12" y="-46" width="9" height="40" rx="4" fill={skin} /><ellipse cx="-8" cy="-4" rx="9" ry="5" fill={HONEY} /></g>
      <g className="leg-b"><rect x="4" y="-46" width="9" height="40" rx="4" fill={skin} /><ellipse cx="9" cy="-4" rx="9" ry="5" fill={HONEY} /></g>
      <g className="walk-bob">
      <path d="M-30 -38L-16 -106Q0 -118 16 -106L30 -38Z" fill={SKY} />
      <path d="M-22 -60H22" stroke="#E4EFF7" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      <circle cx="-22" cy="-164" r="12" fill={hair} /><circle cx="22" cy="-164" r="12" fill={hair} />
      <circle cx="0" cy="-144" r="24" fill={skin} />
      <path d="M-24 -148Q-24 -170 0 -170T24 -148Q12 -160 0 -160T-24 -148Z" fill={hair} />
      <circle cx="19" cy="-172" r="4" fill={HONEY} />
      <Eyes l={-8} r={8} y={-141} rad={2.5} />
      <Cheeks l={-15} r={15} y={-134} rad={3.8} />
      <path d="M-6 -132Q0 -127 6 -132" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <rect x="-22" y="-92" width="44" height="36" rx="5" fill={FOREST} />
      <rect x="-26" y="-99" width="52" height="12" rx="4" fill={FOREST_DK} />
      <rect x="-4" y="-99" width="8" height="43" fill={HONEY} />
      <ellipse cx="-8" cy="-104" rx="9" ry="5.5" fill={HONEY} transform="rotate(-25 -8 -104)" />
      <ellipse cx="8" cy="-104" rx="9" ry="5.5" fill={HONEY} transform="rotate(25 8 -104)" />
      <circle cx="0" cy="-101" r="3.5" fill="#D99A2B" />
      <circle cx="-23" cy="-76" r="6.5" fill={skin} /><circle cx="23" cy="-76" r="6.5" fill={skin} />
      </g>
    </g>
  );
}

function Zara() {
  const skin = "#6B4226", hoodie = "#D99A2B";
  return (
    <g className="fs-breathe" style={{ animationDelay: "-1.8s" }}>
      <rect x="-28" y="-262" width="10" height="74" rx="5" fill={INK} /><rect x="18" y="-262" width="10" height="74" rx="5" fill={INK} />
      <path d="M-24 -108H24L22 -2H4L0 -72-4 -2H-22Z" fill="#3E5A73" />
      <ellipse cx="-13" cy="0" rx="13" ry="5.5" fill="#F3ECE0" stroke="#E8DFD1" /><ellipse cx="13" cy="0" rx="13" ry="5.5" fill="#F3ECE0" stroke="#E8DFD1" />
      <path d="M-32 -104V-166Q-32 -216 0 -216T32 -166V-104Z" fill={hoodie} />
      <rect x="-16" y="-136" width="32" height="16" rx="6" fill="#C4891F" />
      <path d="M-6 -206V-190M6 -206V-190" stroke="#FBF7F0" strokeWidth="2" strokeLinecap="round" />
      <rect x="-8" y="-234" width="16" height="22" rx="7" fill={skin} />
      <circle cx="0" cy="-254" r="24" fill={skin} />
      <path d="M-25 -256Q-25 -282 0 -282T25 -256Q12 -268 0 -268T-25 -256Z" fill={INK} />
      <Eyes l={-8} r={8} y={-248} rad={2.3} />
      <Cheeks l={-14} r={14} y={-240} rad={3.6} />
      <path d="M-6 -239Q0 -235 6 -239" stroke={INK} strokeWidth="2.1" fill="none" strokeLinecap="round" />
      <path d="M-28 -196Q-38 -160-10 -150M28 -196Q38 -160 10 -150" stroke={hoodie} strokeWidth="14" fill="none" strokeLinecap="round" />
      <rect x="-10" y="-176" width="20" height="30" rx="4" fill={INK} />
      <rect x="-7.5" y="-172" width="15" height="21" rx="2" fill={SKY} />
      <circle cx="-10" cy="-152" r="6.5" fill={skin} /><circle cx="10" cy="-152" r="6.5" fill={skin} />
      {/* a share flying from her phone toward the nest */}
      <Share x={-12} y={-200} s={22} className="fs-send" />
      <Share x={-12} y={-200} s={18} className="fs-send" style={{ animationDelay: "1.7s" }} />
    </g>
  );
}

function Uncle() {
  const skin = "#E0A882", hair = "#5A3A28";
  return (
    <g className="fs-breathe" style={{ animationDelay: "-4s" }}>
      <path d="M-30 -118H30L26 -2H6L0 -82-6 -2H-26Z" fill={INK} />
      <ellipse cx="-16" cy="0" rx="14" ry="6" fill="#55625F" /><ellipse cx="16" cy="0" rx="14" ry="6" fill="#55625F" />
      <path d="M-30 -208Q-44 -168-38 -136" stroke={SAGE} strokeWidth="16" fill="none" strokeLinecap="round" />
      <circle cx="-38" cy="-130" r="8.5" fill={skin} />
      <path d="M-34 -114V-180Q-34 -230 0 -230T34 -180V-114Z" fill={SAGE} />
      <rect x="-9" y="-252" width="18" height="26" rx="7" fill={skin} />
      <circle cx="0" cy="-270" r="26" fill={skin} />
      <path d="M-26 -274Q-28 -300 0 -300T26 -274Q16 -288 0 -288T-26 -274Z" fill={hair} />
      <path d="M-24 -266Q-22 -238 0 -238T24 -266Q14 -251 0 -251T-24 -266Z" fill={hair} />
      <Eyes l={-9} r={9} y={-271} />
      <path d="M-7 -258Q0 -253 7 -258" stroke="#FBF7F0" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <g className="fs-wave">
        <path d="M30 -208Q60 -238 54 -278" stroke={SAGE} strokeWidth="16" fill="none" strokeLinecap="round" />
        <circle cx="54" cy="-286" r="10" fill={skin} />
        <path d="M70 -300Q78 -290 72 -278M78 -308Q90 -292 81 -274" stroke={HONEY} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Dog() {
  const fur = "#C99566";
  return (
    <g className="dog-walk"><g className="dog-face">
      <ellipse cx="4" cy="2" rx="32" ry="4" fill="#000" opacity=".1" />
      <g className="fs-wag"><path d="M-26 -34Q-40 -50-34 -62" stroke={fur} strokeWidth="7" fill="none" strokeLinecap="round" /></g>
      <rect className="dog-leg" x="-20" y="-20" width="7" height="20" rx="3" fill={fur} /><rect className="dog-leg b" x="-9" y="-20" width="7" height="20" rx="3" fill="#B7834F" />
      <rect className="dog-leg b" x="10" y="-20" width="7" height="20" rx="3" fill={fur} /><rect className="dog-leg" x="20" y="-20" width="7" height="20" rx="3" fill="#B7834F" />
      <ellipse cx="0" cy="-28" rx="28" ry="16" fill={fur} />
      <ellipse cx="2" cy="-21" rx="16" ry="7" fill="#F1D8BF" />
      <g className="fs-breathe" style={{ animationDuration: "1.4s" }}>
        <path d="M17 -58L14 -76 28 -63Z" fill="#A67B52" /><path d="M33 -61L41 -76 41 -56Z" fill="#A67B52" />
        <circle cx="26" cy="-48" r="15" fill={fur} />
        <ellipse cx="36" cy="-43" rx="8" ry="6" fill="#F1D8BF" />
        <circle cx="42" cy="-45" r="3" fill={INK} />
        <g className="fs-blink" style={{ animationDelay: "1.1s" }}><circle cx="28" cy="-51" r="2.2" fill={INK} /></g>
        <path d="M14 -38Q24 -31 34 -38" stroke={FOREST} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="-33" r="3" fill={HONEY} />
      </g>
    </g></g>
  );
}

function NestPlant() {
  return (
    <g>
      <g className="fs-grow">
        <path d="M0 -34C-2 -62 0 -82 8 -112" stroke={FOREST} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <path d="M2 -66C-14 -66-22 -76-24 -90-10 -89 0 -80 2 -66Z" fill={SAGE} />
        <path d="M5 -86C6 -100 14 -110 30 -112 29 -97 20 -88 5 -86Z" fill={FOREST} />
        <Share x={-5} y={-140} s={28} />
      </g>
      <path d="M-34 -34H34C32 -14 19 0 0 0S-32 -14-34 -34Z" fill="#B7834F" />
      <ellipse cx="0" cy="-34" rx="34" ry="7" fill="#9C6B3E" />
      <path d="M-27 -22C-13 -18 13 -18 28 -24M-20 -11C-8 -7 10 -7 21 -12" stroke="#8A5C33" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
  );
}

export function FamilyScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 780 500" className={className} role="img"
      aria-label="A multigenerational family (grandpa, grandma, dad, mum, a cousin on her phone, an uncle waving, a little girl holding a gift and the family dog) gathered around a nest growing a share">
      {/* backdrop */}
      <ellipse cx="400" cy="275" rx="350" ry="230" fill="#FCEFD3" />
      <circle className="fs-sun" cx="640" cy="105" r="46" fill="#F6CF86" />
      <ellipse cx="395" cy="474" rx="372" ry="15" fill="#EADFCB" />

      {/* ambient: rising hearts & shares */}
      <Heart x={180} y={300} s={20} className="fs-rise" style={{ animationDelay: "0s" }} />
      <Share x={330} y={260} s={22} className="fs-rise" style={{ animationDelay: "2.2s" }} />
      <Heart x={470} y={280} s={16} fill={SAGE} className="fs-rise" style={{ animationDelay: "3.6s" }} />
      <Share x={600} y={300} s={18} className="fs-rise" style={{ animationDelay: "5s" }} />
      <Heart x={90} y={320} s={14} className="fs-rise" style={{ animationDelay: "4.4s" }} />
      <Spark x={262} y={40} s={22} />
      <Spark x={60} y={210} s={16} delay={0.8} />
      <Spark x={730} y={380} s={14} fill={SAGE} delay={1.4} />
      <Spark x={520} y={70} s={14} delay={2} />
      <Heart x={210} y={80} s={24} />
      <Heart x={735} y={250} s={18} fill={SAGE} />

      <g transform={`translate(740 ${GROUND})`}><NestPlant /></g>
      <g transform={`translate(70 ${GROUND})`}><Grandpa /></g>
      <g transform={`translate(290 ${GROUND})`}><Dad /></g>
      <g transform={`translate(405 ${GROUND})`}><Mum /></g>
      <g transform={`translate(172 ${GROUND})`}><Grandma /></g>
      <g transform={`translate(520 ${GROUND})`}><Zara /></g>
      <g transform={`translate(630 ${GROUND})`}><Uncle /></g>
      <g transform={`translate(455 ${GROUND})`}><Dog /></g>
      {/* Amelia walks over to the nest with her gift and back */}
      <g transform={`translate(345 ${GROUND})`}><Amelia /></g>
    </svg>
  );
}
