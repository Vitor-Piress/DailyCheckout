import { ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";
import { Panel } from "./Panel";

export function ExpandablePanel({
  id,
  eyebrow,
  title,
  badge,
  icon,
  expanded,
  onToggle,
  children,
  bodyClassName = "grid min-w-0 gap-3 border-t border-[#e8eee9] p-4 sm:p-5",
}: {
  id: string;
  eyebrow: string;
  title: string;
  badge?: ReactNode;
  icon: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <Panel className="grid min-w-0 gap-0 overflow-hidden !p-0">
      <button
        aria-controls={id}
        aria-expanded={expanded}
        className="flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[#f9fbf9] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2f6840] sm:p-5"
        onClick={onToggle}
        type="button"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ea] text-[#2f6840]">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
              {eyebrow}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-base leading-tight text-[#17211b]">
                {title}
              </h2>
              {badge}
            </div>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#dce5dd] bg-[#f5f7f4] px-2.5 py-1.5 text-xs font-bold text-[#2f6840]">
          <span className="hidden min-[380px]:inline">
            {expanded ? "Recolher" : "Expandir"}
          </span>
          {expanded ? (
            <ChevronUp aria-hidden="true" size={16} />
          ) : (
            <ChevronDown aria-hidden="true" size={16} />
          )}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <m.div
            animate={{ height: "auto", opacity: 1 }}
            className="min-w-0 overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            id={id}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={bodyClassName}>{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}
