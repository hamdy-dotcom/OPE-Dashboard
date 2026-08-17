import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/lib/i18n/routing";
import { isSuper, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { ListSearch } from "@/components/ui/list-search";
import {
  loadAllLookups,
  loadLookupCategories,
  loadThresholds,
  loadUsers,
  type SettingsEntity,
} from "./queries";
import { LookupsTable, UsersTable } from "./settings-tables";
import { ThresholdsForm } from "./settings-forms";
import { SettingsDrawer } from "./settings-drawer";
import { CategoryFilter } from "./category-filter";

const newButton =
  "rounded-[10px] border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-on-ink transition-opacity hover:opacity-90";

/**
 * Settings — users, PM thresholds and the lookup lists. `super_admin` only,
 * the whole page; every action re-checks the same thing.
 */
export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    entity?: string;
    q?: string;
    category?: string;
    id?: string;
    mode?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { locale } = await params;
  const {
    entity: entityParam,
    q = "",
    category = "",
    id,
    mode,
    sort = "",
    dir = "asc",
  } = await searchParams;

  const user = await requireUser(locale);
  if (!isSuper(user.role)) notFound();

  const t = await getTranslations("settings");

  const entity: SettingsEntity =
    entityParam === "lookups" ? "lookups" : entityParam === "thresholds" ? "thresholds" : "users";

  const [users, lookups, thresholds, categories] = await Promise.all([
    loadUsers(entity === "users" ? q : ""),
    entity === "lookups" ? loadAllLookups(category) : [],
    loadThresholds(),
    loadLookupCategories(),
  ]);

  const chips: Chip[] = [
    { value: "", label: t("usersTab"), count: users.length },
    { value: "thresholds", label: t("thresholdsTab"), count: thresholds.length },
    {
      value: "lookups",
      label: t("lookupsTab"),
      count: entity === "lookups" ? lookups.length : categories.length,
    },
  ];

  const query: Record<string, string> = {};
  if (entity !== "users") query.entity = entity;
  if (q) query.q = q;
  if (category) query.category = category;
  if (sort) {
    query.sort = sort;
    query.dir = dir;
  }

  const drawerMode =
    mode === "new" ? "new" : mode === "edit" && id ? "edit" : id ? "view" : null;

  const title =
    entity === "lookups"
      ? t("lookupsTitle")
      : entity === "thresholds"
        ? t("thresholdsTitle")
        : t("usersTitle");

  return (
    <>
      <Panel clip={false}>
        <PanelHead
          title={title}
          actions={
            entity === "lookups" ? (
              <Link
                href={{ pathname: "/settings", query: { ...query, mode: "new" } }}
                className={newButton}
              >
                {t("newLookup")}
              </Link>
            ) : undefined
          }
        />

        <FilterChips
          chips={chips}
          active={entity === "users" ? "" : entity}
          param="entity"
          pathname="/settings"
        />

        {entity === "users" && (
          <>
            <ListSearch pathname="/settings" value={q} placeholder={t("searchUsers")} />
            <UsersTable
              rows={users}
              selectedId={id ?? null}
              query={query}
              sort={sort}
              dir={dir}
            />
          </>
        )}

        {entity === "thresholds" && <ThresholdsForm thresholds={thresholds} />}

        {entity === "lookups" && (
          <>
            <CategoryFilter categories={categories} category={category} />
            <LookupsTable
              rows={lookups}
              selectedId={id ?? null}
              query={query}
              sort={sort}
              dir={dir}
            />
          </>
        )}
      </Panel>

      {entity !== "thresholds" && drawerMode && (
        <SettingsDrawer
          entity={entity}
          mode={drawerMode}
          id={id}
          category={category}
          closeHref={{ pathname: "/settings", query }}
        />
      )}
    </>
  );
}
