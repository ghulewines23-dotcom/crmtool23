"use client";

import * as React from "react";
import { Check } from "lucide-react";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  id?: string;
}

export function Checkbox({ checked, onChange, label, className = "", id }: CheckboxProps) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none group ${className}`}>
      <div
        id={id}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30 ${
          checked
            ? "bg-zinc-900 border-zinc-900 text-white shadow-xs"
            : "border-zinc-300 bg-white hover:border-zinc-500 group-hover:border-zinc-400"
        }`}
      >
        {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </div>
      {label && <span className="text-[13px] font-medium text-zinc-700">{label}</span>}
    </label>
  );
}
