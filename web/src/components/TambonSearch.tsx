import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { TambonSummary } from "../lib/types";
import { searchTambons } from "../lib/util";

type Props = { tambons: TambonSummary[]; selected: TambonSummary | null; onSelect: (id: string) => void };

export function TambonSearch({ tambons, selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchTambons(tambons, query), [tambons, query]);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const pick = (t: TambonSummary) => {
    onSelect(t.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="search" ref={box}>
      <label htmlFor={`${listId}-input`} className="search-label">
        เลือกตำบลในเชียงราย
      </label>
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={selected ? `ต.${selected.name_th} อ.${selected.amphoe_th}` : "พิมพ์ชื่อตำบลหรืออำเภอ"}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && results[active]) pick(results[active]);
          else if (e.key === "Escape") setOpen(false);
          else return;
          e.preventDefault();
        }}
      />
      {open && (
        <ul id={listId} role="listbox" className="search-list">
          {results.length === 0 && <li className="empty">ไม่พบตำบลนี้</li>}
          {results.map((t, i) => (
            <li
              key={t.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : undefined}
              onPointerDown={(e) => {
                e.preventDefault();
                pick(t);
              }}
            >
              <span>ต.{t.name_th}</span>
              <span className="muted">อ.{t.amphoe_th}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
