import { Panel } from "../ui/Panel";
import { SummaryList } from "./SummaryList";

export function ReportList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: Array<{ label: string; detail: string; value: string }>;
  emptyMessage: string;
}) {
  return (
    <Panel>
      <h2 className="mb-4 text-base leading-tight">{title}</h2>
      <SummaryList emptyMessage={emptyMessage} items={items} />
    </Panel>
  );
}
