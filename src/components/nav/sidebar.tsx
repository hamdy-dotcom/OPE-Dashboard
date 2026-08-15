import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { canSeeMoney, canWriteMaster, isSuper, type AppRole } from "@/lib/auth";

type Item = { href: string; label: string; count?: number };
type Group = { label: string; items: Item[] };

/**
 * Role-aware nav tree. A role that cannot use a section never sees it —
 * hiding beats showing-then-erroring.
 */
export async function Sidebar({
  role,
  active,
}: {
  role: AppRole;
  active: string;
}) {
  const t = await getTranslations("nav");

  const groups: Group[] = [
    {
      label: t("overview"),
      items: [{ href: "/day-board", label: t("dayBoard") }],
    },
    {
      label: t("operations"),
      items: [
        { href: "/operations", label: t("dailyOperations") },
        { href: "/charging", label: t("charging") },
      ],
    },
    {
      label: t("maintenance"),
      items: [
        { href: "/rfrs", label: t("rfrs") },
        { href: "/work-orders", label: t("workOrders") },
        { href: "/periodic-maintenance", label: t("periodicMaintenance") },
      ],
    },
    {
      label: t("fleet"),
      items: [
        { href: "/vehicles", label: t("vehicles") },
        { href: "/drivers", label: t("drivers") },
        ...(canWriteMaster(role)
          ? [
              { href: "/vendors", label: t("vendors") },
              { href: "/routes", label: t("routes") },
            ]
          : []),
      ],
    },
  ];

  if (canSeeMoney(role)) {
    groups.push({
      label: t("finance"),
      items: [
        { href: "/scorecards", label: t("scorecards") },
        { href: "/invoices", label: t("invoices") },
      ],
    });
  }

  if (isSuper(role)) {
    groups.push({
      label: t("admin"),
      items: [{ href: "/settings", label: t("settings") }],
    });
  }

  return (
    <nav className="sticky top-[68px] rounded-[14px] bg-surface px-2.5 py-3.5 rim">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-2.5 pb-1.5 pt-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            {g.label}
          </p>
          {g.items.map((item) => {
            const isActive = active.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-1.5 text-[13.5px] transition-colors ${
                  isActive
                    ? "bg-elev font-medium text-ink"
                    : "text-ink-2 hover:bg-raise"
                }`}
              >
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="tnum ms-auto rounded-full bg-idle px-1.5 py-px text-[10.5px] font-semibold text-ink-2">
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
