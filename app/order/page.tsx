import { notFound, redirect } from "next/navigation";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function PublicOrderQueryPage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) notFound();
  redirect(`/order/${encodeURIComponent(token)}`);
}