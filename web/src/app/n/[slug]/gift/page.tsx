import { notFound } from "next/navigation";
import { toPublicNest } from "@/lib/nests";
import { getRepo } from "@/lib/server/repo";
import { GiftFlow } from "./GiftFlow";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const nest = await getRepo().getNest(slug);
  if (!nest) notFound();
  return <GiftFlow nest={toPublicNest(nest)} />;
}
