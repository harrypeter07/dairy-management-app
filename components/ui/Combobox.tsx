"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
  keywords?: string;
};

type ComboboxProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export default function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
}: ComboboxProps) {
  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    const out = options.filter((o) => {
      const hay = `${o.label} ${o.keywords ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
    return out.slice(0, 50);
  }, [options, query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const displayValue = open ? query : selected?.label ?? "";

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-sm font-medium text-foreground/80 mb-1">
        {label}
        {required ? <span className="text-destructive ml-1">*</span> : null}
      </label>
      <input
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-md border border-border bg-white/80 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-autocomplete="list"
        aria-expanded={open}
      />

      {open && !disabled ? (
        <div className="absolute z-[210] mt-1 w-full rounded-md border border-border bg-white shadow-xl max-h-64 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setQuery("");
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary/40 ${
                  o.value === value ? "bg-secondary/40" : ""
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

