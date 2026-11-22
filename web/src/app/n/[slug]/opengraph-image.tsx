import { ImageResponse } from "next/og";
import { nestTotals } from "@/lib/nests";
import { getRepo } from "@/lib/server/repo";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A StockNest gift page";

/** The card WhatsApp, Telegram and iMessage show when a nest link is shared. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = getRepo();
  const nest = await repo.getNest(slug);
  const name = nest?.childName ?? "a child";

  let photo: string | undefined;
  if (nest?.photo && nest.showPhoto) {
    if (nest.photo.startsWith("/api/uploads/")) {
      const file = nest.photo.split("/").pop()!;
      const bytes = await repo.readPhoto(file);
      if (bytes && !file.endsWith(".webp")) photo = `data:image/${file.endsWith(".png") ? "png" : "jpeg"};base64,${bytes.toString("base64")}`;
    } else {
      photo = nest.photo;
    }
  }
  const t = nest ? nestTotals(nest) : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg, #17705A 0%, #0C513F 55%, #083B2E 100%)", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flex: 1, background: "#FBF7F0", borderRadius: 40, padding: 56, alignItems: "center", gap: 56 }}>
          <div style={{ display: "flex", width: 300, height: 300, borderRadius: 300, overflow: "hidden", border: "10px solid #fff", background: "#E4EFF7", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {photo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={photo} width={300} height={300} style={{ objectFit: "cover" }} alt="" />
              : <div style={{ display: "flex", fontSize: 140, fontWeight: 700, color: "#0C513F" }}>{name.charAt(0).toUpperCase()}</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 30, color: "#0C513F", fontWeight: 700, letterSpacing: 1 }}>STOCKNEST</div>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#1F2A2E", lineHeight: 1.05, marginTop: 16 }}>Gift {name} a stock</div>
            <div style={{ display: "flex", fontSize: 32, color: "#55625F", marginTop: 20, lineHeight: 1.3 }}>
              {t && t.giftCount ? `${t.giftCount} family gifts so far. Add yours with a message.` : "Be the first in the family to gift a real share."}
            </div>
            <div style={{ display: "flex", marginTop: 36, alignSelf: "flex-start", background: "#0C513F", color: "#fff", fontSize: 30, fontWeight: 700, padding: "18px 34px", borderRadius: 999 }}>Gift a Stock</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
