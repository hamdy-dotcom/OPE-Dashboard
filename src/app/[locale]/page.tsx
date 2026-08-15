import { redirect } from "@/lib/i18n/routing";

export default async function Index({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/day-board", locale });
}
