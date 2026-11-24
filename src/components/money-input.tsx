"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "onFocus" | "onBlur" | "min" | "max"> & {
  value: number;
  min?: number;
  max: number;
  onValueChange: (value: number) => void;
};

export default function MoneyInput({ value, min = 0, max, onValueChange, ...props }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const normalize = (raw: string) => Math.round(Math.max(min, Math.min(max, Number(raw) || 0)) * 100) / 100;
  return <input {...props} type="number" inputMode="decimal" min={min} max={max} value={draft ?? String(value)}
    onFocus={() => setDraft(value === 0 ? "" : String(value))}
    onChange={event => {
      const raw = event.currentTarget.value.replace(/^0+(?=\d)/, "");
      setDraft(raw);
      onValueChange(normalize(raw));
    }}
    onBlur={() => {
      onValueChange(normalize(draft ?? String(value)));
      setDraft(null);
    }}
  />;
}
