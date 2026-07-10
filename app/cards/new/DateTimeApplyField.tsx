"use client";

import { useEffect, useMemo, useState } from "react";

const hours = Array.from({ length: 24 }, (_, index) => index.toString().padStart(2, "0"));
const minutes = Array.from({ length: 6 }, (_, index) => (index * 10).toString().padStart(2, "0"));

type DateTimeApplyFieldProps = {
  value: string;
  onApply: (value: string) => void;
  required?: boolean;
};

export function DateTimeApplyField({ value, onApply, required }: DateTimeApplyFieldProps) {
  const parsed = useMemo(() => parseDateTimeValue(value), [value]);
  const [date, setDate] = useState(parsed.date);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const next = parseDateTimeValue(value);
    setDate(next.date);
    setHour(next.hour);
    setMinute(next.minute);
    setIsDirty(false);
  }, [value]);

  const canApply = date.length > 0;

  function markDirty(setter: (value: string) => void, nextValue: string) {
    setter(nextValue);
    setIsDirty(true);
  }

  function apply() {
    if (!canApply) {
      return;
    }

    onApply(`${date}T${hour}:${minute}`);
    setIsDirty(false);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_72px_72px] gap-2">
        <input
          value={date}
          onChange={(event) => markDirty(setDate, event.target.value)}
          required={required}
          type="date"
          className="field-input"
        />
        <select
          value={hour}
          onChange={(event) => markDirty(setHour, event.target.value)}
          className="field-input px-2 text-center"
          aria-label="시"
        >
          {hours.map((item) => (
            <option key={item} value={item}>
              {item}시
            </option>
          ))}
        </select>
        <select
          value={minute}
          onChange={(event) => markDirty(setMinute, event.target.value)}
          className="field-input px-2 text-center"
          aria-label="분"
        >
          {minutes.map((item) => (
            <option key={item} value={item}>
              {item}분
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="min-h-5 text-xs font-medium text-ink/45">
          {value ? formatAppliedValue(value) : "날짜와 시간을 고른 뒤 적용해주세요."}
        </p>
        <button
          type="button"
          onClick={apply}
          disabled={!canApply || !isDirty}
          className="min-h-8 rounded-md border border-line bg-white px-3 text-xs font-bold text-ink/70 transition hover:border-moss/40 disabled:cursor-not-allowed disabled:opacity-45"
        >
          적용
        </button>
      </div>
    </div>
  );
}

function parseDateTimeValue(value: string) {
  if (!value) {
    return { date: "", hour: "12", minute: "00" };
  }

  const [date = "", time = "12:00"] = value.split("T");
  const [rawHour = "12", rawMinute = "00"] = time.split(":");
  const roundedMinute = roundMinute(rawMinute);

  return {
    date,
    hour: rawHour.padStart(2, "0").slice(0, 2),
    minute: roundedMinute
  };
}

function roundMinute(value: string) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return "00";
  }

  return (Math.floor(numeric / 10) * 10).toString().padStart(2, "0");
}

function formatAppliedValue(value: string) {
  const [date, time] = value.split("T");
  return `${date} ${time}`;
}