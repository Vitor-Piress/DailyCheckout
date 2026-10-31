export function SummaryList({
  items,
  emptyMessage,
}: {
  items: Array<{ label: string; detail: string; value: string }>;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="m-0 text-[#617067]">{emptyMessage}</p>;
  }
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {items.map((item) => (
        <li className="flex items-center justify-between gap-4" key={item.label}>
          <span className="grid gap-0.5">
            <strong>{item.label}</strong>
            <small className="text-xs text-[#617067]">{item.detail}</small>
          </span>
          <b className="whitespace-nowrap text-[#2f6840]">{item.value}</b>
        </li>
      ))}
    </ul>
  );
}
