import type { Metadata } from "next";
import { Button } from "@/components/ui";
import { toPublicNest } from "@/lib/nests";
import { getRepo } from "@/lib/server/repo";
import { GiftPage } from "./GiftPage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const nest = await getRepo().getNest(slug);
  if (!nest) return { title: "Nest not found | StockNest" };
  const title = `Gift ${nest.childName} a stock 🎁`;
  const description = nest.note || `Help build ${nest.childName}'s Stock Nest. Gift a real tokenized stock with a personal message.`;
  return { title: `${title} | StockNest`, description, openGraph: { title, description, type: "website" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const nest = await getRepo().getNest(slug);
  if (!nest) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">This nest isn&apos;t available</h1>
        <p className="mt-3 text-ink-2">The link may be mistyped, or the parent may have made it private.</p>
        <Button href="/" className="mt-6">Go to StockNest</Button>
      </div>
    );
  }
  return <GiftPage nest={toPublicNest(nest)} />;
}
