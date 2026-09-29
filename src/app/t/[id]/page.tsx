import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SharedTripView } from "@/components/SharedTripView";
import { loadShare } from "@/lib/share";

// Metadata and the page both need the trip; cache() makes it one Redis read.
const getShared = cache(loadShare);

export async function generateMetadata(props: PageProps<"/t/[id]">): Promise<Metadata> {
  const shared = await getShared((await props.params).id);
  if (!shared) return { title: "Trip not found · Aventurieret" };
  const { plan } = shared;
  return {
    title: `${plan.title} · Aventurieret`,
    description: plan.summary,
    openGraph: { title: plan.title, description: plan.summary, siteName: "Aventurieret" },
  };
}

export default async function SharedTripPage(props: PageProps<"/t/[id]">) {
  const { id } = await props.params;
  const shared = await getShared(id);
  if (!shared) notFound();
  return <SharedTripView id={id} request={shared.request} plan={shared.plan} />;
}
