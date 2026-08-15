import { Panel, PanelHead } from "@/components/ui/panel";
import { Empty } from "@/components/ui/empty";

/** TODO(claude-code): build this module. See CLAUDE.md section 6. */
export default function Page() {
  return (
    <Panel className="xl:col-span-2">
      <PanelHead title="scorecards" />
      <Empty title="Not built yet" hint="See CLAUDE.md section 6." />
    </Panel>
  );
}
