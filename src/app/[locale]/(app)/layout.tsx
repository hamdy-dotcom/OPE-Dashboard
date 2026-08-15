import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";

/**
 * Three-pane shell: nav tree · record list · detail panel.
 * Panes stack below 1180px.
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);

  return (
    <>
      <Topbar user={user} />
      <div className="grid items-start gap-3.5 px-5 pb-7 pt-3.5 xl:grid-cols-[232px_minmax(340px,400px)_minmax(0,1fr)]">
        <div className="hidden xl:block">
          <Sidebar role={user.role} active="/day-board" />
        </div>
        {children}
      </div>
    </>
  );
}
