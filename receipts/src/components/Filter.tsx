import type { FilterPeriod } from "../types";

interface Props {
  value: FilterPeriod;
  onChange: (p: FilterPeriod) => void;
}

const OPTIONS: { value: FilterPeriod; label: string }[] = [
  { value: "this-week", label: "This Week" },
  { value: "last-week", label: "Last Week" },
  { value: "all-time", label: "All Time" },
];

export default function Filter({ value, onChange }: Props) {
  return (
    <div className="filter-bar">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={value === opt.value ? "active" : ""}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
