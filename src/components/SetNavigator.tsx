'use client';

import React, { useState } from 'react';
import CardList from './CardList';

interface SetData {
  id: string;
  name_de: string;
  series: string;
}

interface CardData {
  id: string;
  set_id: string;
  set_name: string;
  card_number: string;
  name_de: string;
  rarity: string;
  has_reverse_holo: boolean;
  image_url?: string;
  is_collected_base: boolean;
  is_collected_reverse: boolean;
}

interface SetNavigatorProps {
  groupedSets: Record<string, SetData[]>;
  allCards: CardData[];
}

export default function SetNavigator({ groupedSets, allCards }: SetNavigatorProps) {
  // Első szett kijelölése alapértelmezetten
  const firstSeries = Object.keys(groupedSets)[0];
  const firstSetId = firstSeries && groupedSets[firstSeries][0] ? groupedSets[firstSeries][0].id : '';

  const [selectedSetId, setSelectedSetId] = useState<string>(firstSetId);

  // Kiszűrjük pontosan a kiválasztott szetthez tartozó kártyákat
const activeCards = allCards
  .filter((card) => card.set_id === selectedSetId)
  .sort((a, b) => {
    // Kinyerjük a tiszta számokat a sorszámból (pl. "005" -> 5, "TG01" -> 1)
    const numA = parseInt(a.card_number.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.card_number.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });
  // Megkeressük a kiválasztott szett adatait
  const activeSetInfo = Object.values(groupedSets)
    .flat()
    .find((s) => s.id === selectedSetId);

  return (
    <div className="space-y-6">
      {/* 📁 ÉRÁK ÉS SZETTEK VÁLASZTÓSÁVJA */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          📁 Választható Szettek & Érák
        </h2>

        {Object.entries(groupedSets).map(([seriesName, seriesSets]) => (
          <div key={seriesName} className="space-y-2">
            <div className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <span>📂</span> {seriesName}
            </div>

            <div className="flex flex-wrap gap-2 pl-4">
              {seriesSets.map((set) => {
                const isActive = set.id === selectedSetId;
                return (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => setSelectedSetId(set.id)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 scale-105 border border-emerald-400'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
                    }`}
                  >
                    {set.name_de} <span className="text-xs opacity-60">({set.id.toUpperCase()})</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 🃏 KIVÁLASZTOTT SZETT KÁRTYÁINAK MEGJELENÍTÉSE */}
      {activeSetInfo ? (
        <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-white">{activeSetInfo.name_de}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Szett azonosító: <span className="text-emerald-400">{activeSetInfo.id.toUpperCase()}</span> | Összesen {activeCards.length} kártya
              </p>
            </div>
          </div>

          {/* Key hozzáadásával kényszerítjük a CardList újratöltését váltáskor */}
          <CardList key={selectedSetId} initialCards={activeCards} />
        </div>
      ) : (
        <div className="text-center p-8 text-slate-500">Kattints az egyik fenti szettre a kártyák megtekintéséhez!</div>
      )}
    </div>
  );
}