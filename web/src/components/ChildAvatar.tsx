/* eslint-disable @next/next/no-img-element */
import clsx from "clsx";
import type { AvatarKind } from "@/lib/nests";

const BLUSH = "#E9958A";

function Illustrated({ kind }: { kind: AvatarKind }) {
  switch (kind) {
    case "amelia":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <rect width="100" height="100" fill="#E4EFF7" />
          <path d="M18 104C18 80 32 72 50 72S82 80 82 104Z" fill="#8FB8D8" />
          <rect x="44" y="60" width="12" height="16" rx="5" fill="#A8704C" />
          <circle cx="26" cy="34" r="13" fill="#2A1A12" /><circle cx="74" cy="34" r="13" fill="#2A1A12" />
          <circle cx="50" cy="44" r="24" fill="#A8704C" />
          <path d="M26 42C26 24 38 18 50 18S74 24 74 42C68 32 60 30 50 30S32 32 26 42Z" fill="#2A1A12" />
          <g className="fs-blink"><circle cx="41" cy="47" r="2.6" fill="#1F2A2E" /><circle cx="59" cy="47" r="2.6" fill="#1F2A2E" /></g>
          <circle cx="35" cy="54" r="4" fill={BLUSH} opacity=".45" /><circle cx="65" cy="54" r="4" fill={BLUSH} opacity=".45" />
          <path d="M43 56Q50 62 57 56" stroke="#1F2A2E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="71" cy="25" r="4" fill="#F2B34A" />
        </svg>
      );
    case "tobi":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <rect width="100" height="100" fill="#E1EDE8" />
          <path d="M18 104C18 80 32 72 50 72S82 80 82 104Z" fill="#F2B34A" />
          <rect x="44" y="60" width="12" height="16" rx="5" fill="#8D5A3B" />
          <circle cx="50" cy="44" r="24" fill="#8D5A3B" />
          <path d="M26 40C25 24 36 17 50 17S75 24 74 40C68 30 60 28 50 28S32 30 26 40Z" fill="#1F2A2E" />
          <g className="fs-blink"><circle cx="41" cy="47" r="2.6" fill="#1F2A2E" /><circle cx="59" cy="47" r="2.6" fill="#1F2A2E" /></g>
          <circle cx="35" cy="54" r="4" fill={BLUSH} opacity=".4" /><circle cx="65" cy="54" r="4" fill={BLUSH} opacity=".4" />
          <path d="M43 56Q50 62 57 56" stroke="#1F2A2E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "sprout":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <rect width="100" height="100" fill="#FCEFD3" />
          <path d="M50 70V42" stroke="#0C513F" strokeWidth="5" strokeLinecap="round" />
          <path d="M50 50C36 50 30 40 29 30 42 31 49 38 50 50Z" fill="#4E8F86" />
          <path d="M50 46C51 34 58 25 72 24 71 37 63 45 50 46Z" fill="#0C513F" />
          <path d="M24 68H76C74 82 63 88 50 88S26 82 24 68Z" fill="#B7834F" />
        </svg>
      );
    case "bear":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <rect width="100" height="100" fill="#E4EFF7" />
          <circle cx="30" cy="34" r="11" fill="#B7834F" /><circle cx="70" cy="34" r="11" fill="#B7834F" />
          <circle cx="50" cy="56" r="28" fill="#C99566" />
          <ellipse cx="50" cy="66" rx="13" ry="10" fill="#F1D8BF" />
          <g className="fs-blink"><circle cx="40" cy="50" r="3" fill="#1F2A2E" /><circle cx="60" cy="50" r="3" fill="#1F2A2E" /></g>
          <ellipse cx="50" cy="61" rx="4.5" ry="3.2" fill="#1F2A2E" />
          <path d="M45 69Q50 73 55 69" stroke="#1F2A2E" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );
  }
}

export function ChildAvatar({
  kind, photo, showPhoto = true, size = 104, ring = true, className, alt = "Child avatar",
}: { kind: AvatarKind; photo?: string; showPhoto?: boolean; size?: number; ring?: boolean; className?: string; alt?: string }) {
  return (
    <span
      className={clsx("block shrink-0 overflow-hidden rounded-full bg-sky-soft", ring && "border-[5px] border-paper shadow-soft", className)}
      style={{ width: size, height: size }}
    >
      {photo && showPhoto ? <img src={photo} alt={alt} className="h-full w-full object-cover" /> : <Illustrated kind={kind} />}
    </span>
  );
}

export const AVATAR_KINDS: AvatarKind[] = ["amelia", "tobi", "sprout", "bear"];
