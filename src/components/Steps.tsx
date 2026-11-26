type Step = { label: string; state: "done" | "active" | "todo" };

export function Steps({ items }: { items: Step[] }) {
  return (
    <div className="steps" aria-label="Progress">
      {items.map((s) => (
        <span key={s.label} className={`step ${s.state === "todo" ? "" : s.state}`.trim()}>
          {s.label}
        </span>
      ))}
    </div>
  );
}
