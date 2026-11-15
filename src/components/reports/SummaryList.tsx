export function SummaryList({
  items,
  emptyMessage,
}: {
  items: Array<{ label: string; detail: string; value: string }>;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="m-0 text-sm text-[#617067]">{emptyMessage}</p>;
  }
  return (
    <ul className="m-0 grid min-w-0 list-none gap-3 p-0">
      {items.map((item) => (
        <li
          className="flex min-w-0 items-start justify-between gap-3"
          key={item.label}
        >
          <span className="grid min-w-0 gap-0.5">
            <strong className="break-words text-sm text-[#17211b]">
              {item.label}
            </strong>
            <small className="break-words text-xs text-[#617067]">
              {item.detail}
            </small>
          </span>
          <b className="shrink-0 whitespace-nowrap pt-0.5 text-sm text-[#2f6840]">
            {item.value}
          </b>
        </li>
      ))}
    </ul>
  );
}
