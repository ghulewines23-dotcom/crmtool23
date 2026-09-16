"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select option",
  className = "",
  size = "md",
}: {
  options: CustomSelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-white border border-zinc-200 text-zinc-900 rounded-2xl font-semibold shadow-xs hover:border-zinc-300 transition-all outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 ${
          size === "sm" ? "h-9 px-3 text-[12px]" : "h-11 px-4 text-[13px]"
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-500 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 min-w-[180px] bg-white border border-zinc-200/90 rounded-2xl shadow-xl p-1.5 max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left ${
                  isSelected
                    ? "bg-zinc-900 text-white font-semibold"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
