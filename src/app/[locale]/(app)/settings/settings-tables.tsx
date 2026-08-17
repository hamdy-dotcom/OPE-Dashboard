"use client";

import { useTranslations } from "next-intl";
import { DataTable, orDash, type Column } from "@/components/ui/data-table";
import { Empty } from "@/components/ui/empty";
import { Micro } from "@/components/ui/micro";
import { Pill } from "@/components/ui/pill";
import type { LookupRow, UserRow } from "./queries";

export function UsersTable({
  rows,
  selectedId,
  query,
  sort,
  dir,
}: {
  rows: UserRow[];
  selectedId: string | null;
  query: Record<string, string>;
  sort: string;
  dir: string;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: t("field.fullName"),
      sortValue: (r) => r.fullName,
      cell: (r) => <span className="font-medium">{r.fullName}</span>,
    },
    {
      key: "jobTitle",
      header: t("field.jobTitle"),
      className: "hidden md:table-cell",
      sortValue: (r) => r.jobTitle,
      cell: (r) => orDash(r.jobTitle),
    },
    {
      key: "role",
      header: t("field.role"),
      sortValue: (r) => r.role,
      cell: (r) => <Pill tone="idle">{t(`role.${r.role}`)}</Pill>,
    },
    {
      key: "engineer",
      header: t("field.isEngineer"),
      sortValue: (r) => (r.isEngineer ? 1 : 0),
      cell: (r) =>
        r.isEngineer ? <Micro bar={false}>{t("engineer")}</Micro> : orDash(null),
    },
    {
      key: "active",
      header: t("field.isActive"),
      sortValue: (r) => (r.isActive ? 1 : 0),
      cell: (r) => (
        <Pill tone={r.isActive ? "go" : "idle"}>
          {r.isActive ? t("active") : t("inactive")}
        </Pill>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      selectedId={selectedId}
      pathname="/settings"
      query={query}
      sort={sort}
      dir={dir}
      empty={<Empty title={tCommon("empty")} hint={t("noUsersHint")} />}
    />
  );
}

export function LookupsTable({
  rows,
  selectedId,
  query,
  sort,
  dir,
}: {
  rows: LookupRow[];
  selectedId: string | null;
  query: Record<string, string>;
  sort: string;
  dir: string;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");

  const columns: Column<LookupRow>[] = [
    {
      key: "category",
      header: t("field.category"),
      className: "hidden md:table-cell",
      sortValue: (r) => r.categoryLabel,
      cell: (r) => r.categoryLabel,
    },
    {
      key: "code",
      header: t("field.code"),
      sortValue: (r) => r.code,
      cell: (r) => <span className="tnum font-medium">{r.code}</span>,
    },
    {
      key: "labelEn",
      header: t("field.labelEn"),
      sortValue: (r) => r.labelEn,
      cell: (r) => r.labelEn,
    },
    {
      key: "labelAr",
      header: t("field.labelAr"),
      className: "hidden lg:table-cell",
      sortValue: (r) => r.labelAr,
      cell: (r) => orDash(r.labelAr),
    },
    {
      key: "sortOrder",
      header: t("field.sortOrder"),
      numeric: true,
      sortValue: (r) => r.sortOrder,
      cell: (r) => r.sortOrder,
    },
    {
      key: "active",
      header: t("field.isActive"),
      sortValue: (r) => (r.isActive ? 1 : 0),
      cell: (r) => (
        <Pill tone={r.isActive ? "go" : "idle"}>
          {r.isActive ? t("active") : t("inactive")}
        </Pill>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      selectedId={selectedId}
      pathname="/settings"
      query={query}
      sort={sort}
      dir={dir}
      empty={<Empty title={tCommon("empty")} hint={t("noLookupsHint")} />}
    />
  );
}
