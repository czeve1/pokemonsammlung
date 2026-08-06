'use client';

import React from 'react';

interface SetSelectorProps {
  allSets: any[];
  activeSetId: string;
}

export default function SetSelector({ allSets, activeSetId }: SetSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    // Oldalfrissítéssel kényszerítjük az új szett adatainak letöltését
    window.location.href = `/?set=${selectedId}`;
  };

  // Szettek csoportosítása 'series' (sorozat) alapján
  const groupedSets = allSets.reduce((acc: { [key: string]: any[] }, set) => {
    const seriesName = set.series || 'Egyéb szettek';
    if (!acc[seriesName]) {
      acc[seriesName] = [];
    }
    acc[seriesName].push(set);
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="set-select" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Szett kiválasztása:
      </label>
      <select
        id="set-select"
        value={activeSetId}
        onChange={handleChange}
        className="bg-slate-900 text-slate-100 border border-slate-600 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
      >
        {Object.entries(groupedSets).map(([series, sets]) => (
          <optgroup key={series} label={series} className="bg-slate-800 text-amber-400 font-bold">
            {sets.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100 font-normal">
                {s.name_de || s.name || s.id} {s.printed_code ? `[${s.printed_code}]` : s.code ? `(${s.code})` : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}