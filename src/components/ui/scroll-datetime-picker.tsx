"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

// ─── Wheel option constants ───
const DAYS = Array.from({ length: 31 }, (_, i) => {
  const d = String(i + 1);
  return { label: d, value: d };
});

const MONTHS = [
  { label: "Jan", value: "0" },
  { label: "Feb", value: "1" },
  { label: "Mar", value: "2" },
  { label: "Apr", value: "3" },
  { label: "May", value: "4" },
  { label: "Jun", value: "5" },
  { label: "Jul", value: "6" },
  { label: "Aug", value: "7" },
  { label: "Sept", value: "8" },
  { label: "Oct", value: "9" },
  { label: "Nov", value: "10" },
  { label: "Dec", value: "11" },
];

const YEARS = [
  { label: "2025", value: "2025" },
  { label: "2026", value: "2026" },
  { label: "2027", value: "2027" },
  { label: "2028", value: "2028" },
  { label: "2029", value: "2029" },
  { label: "2030", value: "2030" },
];

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = String(i + 1);
  return { label: h, value: h };
});

const MINUTES = Array.from({ length: 60 }, (_, i) => {
  const m = String(i).padStart(2, "0");
  return { label: m, value: m };
});

const AMPM = [
  { label: "am", value: "am" },
  { label: "pm", value: "pm" },
];

// ─── Smooth scrollable wheel roller column ───
export function WheelColumn({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  const currentIndex = options.findIndex((o) => o.value === value);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;
  const touchStartY = useRef(0);
  const lastScrollTime = useRef(0);

  const goToPrev = useCallback(() => {
    const prev = options[(activeIdx - 1 + options.length) % options.length];
    onChange(prev.value);
  }, [activeIdx, options, onChange]);

  const goToNext = useCallback(() => {
    const next = options[(activeIdx + 1) % options.length];
    onChange(next.value);
  }, [activeIdx, options, onChange]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastScrollTime.current < 80) return;
      lastScrollTime.current = now;
      if (e.deltaY > 0) goToNext();
      else goToPrev();
    },
    [goToNext, goToPrev]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 15) {
        if (diff > 0) goToNext();
        else goToPrev();
      }
    },
    [goToNext, goToPrev]
  );

  const prev = options[(activeIdx - 1 + options.length) % options.length];
  const curr = options[activeIdx];
  const next = options[(activeIdx + 1) % options.length];

  return (
    <div
      className="flex flex-col items-center justify-center select-none py-1 min-w-[48px] touch-none"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        onClick={goToPrev}
        className="text-[13px] font-normal text-zinc-400 hover:text-zinc-200 py-1 transition-colors"
      >
        {prev.label}
      </button>

      <div className="w-full border-y border-zinc-400/80 py-1.5 text-center my-1.5">
        <span className="text-[16px] font-semibold text-white tracking-wide">{curr.label}</span>
      </div>

      <button
        type="button"
        onClick={goToNext}
        className="text-[13px] font-normal text-zinc-400 hover:text-zinc-200 py-1 transition-colors"
      >
        {next.label}
      </button>
    </div>
  );
}

/**
 * Shared "Set date and time" wheel picker modal.
 * Used for lead follow-ups and task start/end dates.
 */
export function ScrollDateTimePickerModal({
  isOpen,
  initialDate,
  title = "Set date and time",
  onClose,
  onSet,
  onClear,
}: {
  isOpen: boolean;
  initialDate?: string | null;
  title?: string;
  onClose: () => void;
  onSet: (formattedDateTime: string) => void;
  onClear: () => void;
}) {
  const now = new Date();
  const [day, setDay] = useState(String(now.getDate()));
  const [month, setMonth] = useState(String(now.getMonth()));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [hour, setHour] = useState(String(now.getHours() % 12 || 12));
  const [minute, setMinute] = useState(String(now.getMinutes()).padStart(2, "0"));
  const [ampmVal, setAmpmVal] = useState(now.getHours() >= 12 ? "pm" : "am");

  // Hydrate wheels from the initial value whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    const d = initialDate ? new Date(initialDate) : new Date();
    if (!isNaN(d.getTime())) {
      setDay(String(d.getDate()));
      setMonth(String(d.getMonth()));
      setYear(String(d.getFullYear()));
      const h = d.getHours();
      setHour(String(h % 12 || 12));
      setMinute(String(d.getMinutes()).padStart(2, "0"));
      setAmpmVal(h >= 12 ? "pm" : "am");
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSet = () => {
    // Construct Date object
    let hInt = parseInt(hour, 10);
    if (ampmVal === "pm" && hInt < 12) hInt += 12;
    if (ampmVal === "am" && hInt === 12) hInt = 0;

    const dObj = new Date(
      parseInt(year, 10),
      parseInt(month, 10),
      parseInt(day, 10),
      hInt,
      parseInt(minute, 10)
    );
    onSet(dObj.toISOString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-hidden">
      <div className="bg-[#292c34] text-white rounded-[28px] p-6 shadow-2xl w-full max-w-sm border-zinc-700/60 space-y-6">
        <div>
          <h3 className="text-xl font-normal text-white tracking-tight">{title}</h3>
        </div>

        {/* Roller Wheel Container */}
        <div className="space-y-6 py-2">
          {/* Date Wheels (Day, Month, Year) */}
          <div className="grid grid-cols-3 gap-2 items-center text-center">
            <WheelColumn options={DAYS} value={day} onChange={setDay} />
            <WheelColumn options={MONTHS} value={month} onChange={setMonth} />
            <WheelColumn options={YEARS} value={year} onChange={setYear} />
          </div>

          {/* Time Wheels (Hour, Minute, AM/PM) */}
          <div className="grid grid-cols-3 gap-2 items-center text-center">
            <WheelColumn options={HOURS} value={hour} onChange={setHour} />
            <div className="flex items-center justify-center">
              <WheelColumn options={MINUTES} value={minute} onChange={setMinute} />
            </div>
            <WheelColumn options={AMPM} value={ampmVal} onChange={setAmpmVal} />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-700/40">
          <button
            type="button"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="text-[14px] font-medium text-[#eab308] hover:text-yellow-400 transition-colors"
          >
            Clear
          </button>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onClose}
              className="text-[14px] font-medium text-[#eab308] hover:text-yellow-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSet}
              className="text-[14px] font-semibold text-[#eab308] hover:text-yellow-400 transition-colors"
            >
              Set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
