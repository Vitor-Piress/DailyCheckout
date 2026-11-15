import type { ReactNode } from "react";
import { Panel } from "../ui/Panel";
import { SummaryList } from "./SummaryList";

export function ReportList({
  title,
  items,
  emptyMessage,
  variant = "panel",
  icon,
}: {
  title: string;
  items: Array<{ label: string; detail: string; value: string }>;
  emptyMessage: string;
  variant?: "panel" | "inset";
  icon?: ReactNode;
}) {
  if (variant === "inset") {
    return (
      <section className="grid min-w-0 content-start gap-3 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-4">
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[#e2ebe4] pb-2.5">
          <div className="flex min-w-0 items-center gap-2">
            {icon && <span className="shrink-0 text-[#4a7957]">{icon}</span>}
            <h3 className="m-0 truncate text-sm font-bold leading-tight text-[#17211b]">
              {title}
            </h3>
          </div>
          <span className="shrink-0 rounded-full border border-[#dce5dd] bg-white px-2 py-0.5 text-[11px] font-bold text-[#4a7957]">
            {items.length}
          </span>
        </div>
        <SummaryList emptyMessage={emptyMessage} items={items} />
      </section>
    );
  }

  return (
    <Panel className="min-w-0">
      <div className="mb-4 flex min-w-0 items-center gap-2">
        {icon && <span className="shrink-0 text-[#4a7957]">{icon}</span>}
        <h2 className="m-0 text-base leading-tight">{title}</h2>
      </div>
      <SummaryList emptyMessage={emptyMessage} items={items} />
    </Panel>
  );
}
