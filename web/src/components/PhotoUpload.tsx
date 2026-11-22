/* eslint-disable @next/next/no-img-element */
"use client";

import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

const MAX_BYTES = 10 * 1024 * 1024;
const OUT_SIZE = 512;

/** Center-crop to a square, resize to 512px and compress to JPEG. Re-encoding also strips EXIF data (including GPS). */
async function toSquareJpeg(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const sx = (bmp.width - side) / 2, sy = (bmp.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = OUT_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, sx, sy, side, side, 0, 0, OUT_SIZE, OUT_SIZE);
  bmp.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function PhotoUpload({ value, onChange }: { value?: string; onChange: (dataUrl?: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function handle(file?: File) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file (JPG, PNG or HEIC).");
    if (file.size > MAX_BYTES) return setError("That photo is over 10 MB. Please choose a smaller one.");
    setBusy(true);
    try { onChange(await toSquareJpeg(file)); }
    catch { setError("We couldn't read that photo. Try a JPG or PNG."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
          className={`group relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed transition ${drag ? "border-forest bg-forest-soft" : "border-line bg-sand hover:border-forest"}`}
          aria-label={value ? "Change child photo" : "Upload child photo"}
        >
          {value ? (
            <>
              <img src={value} alt="Child photo preview" className="h-full w-full object-cover" />
              <span className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"><Camera size={22} /></span>
            </>
          ) : (
            <span className="grid justify-items-center gap-1 text-xs font-semibold text-ink-2">
              {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-forest border-t-transparent" /> : <ImagePlus size={24} className="text-forest" />}
              {busy ? "Processing" : "Add photo"}
            </span>
          )}
        </button>
        <div className="text-sm">
          <p className="font-semibold">{value ? "Looking lovely!" : "Upload a photo of your child"}</p>
          <p className="mt-0.5 text-ink-3">It will be cropped to a circle. You can also drag a photo here.</p>
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={() => input.current?.click()} className="font-semibold text-forest hover:underline">{value ? "Change" : "Choose photo"}</button>
            {value && <button type="button" onClick={() => onChange(undefined)} className="inline-flex items-center gap-1 font-semibold text-error hover:underline"><Trash2 size={14} />Remove</button>}
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
    </div>
  );
}
