'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SetImporterProps {
  initialSetId?: string;
}

export default function SetImporter({ initialSetId = '' }: SetImporterProps) {
  const [setId, setSetId] = useState(initialSetId);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setId.trim()) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/import-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: setId.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Hiba történt az importálás során');
      }

      setMessage(data.message || 'Sikeres importálás!');
      
      // Átirányítás a főoldalra az új szett kiválasztásával 1.5 másodperc múlva
      setTimeout(() => {
        router.push(`/?set=${setId.trim()}`);
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl shadow-xl">
      <h2 className="text-sm font-bold text-slate-300 mb-3">⚡ Import von neue Set (TCGDex)</h2>
      <form onSubmit={handleImport} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <input
          type="text"
          placeholder="Set ID (bsp. sv01, sv05, swsh1)..."
          value={setId}
          onChange={(e) => setSetId(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/80 flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/10 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? 'Importálás...' : 'Set Runterladen'}
        </button>
      </form>

      {message && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold">
          ✓ {message}
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}