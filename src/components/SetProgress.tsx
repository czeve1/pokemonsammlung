import React from 'react';

interface Card {
  id: string;
  card_number: string;
  name_de: string;
  rarity: string;
  has_reverse_holo: boolean;
  is_collected_base?: boolean;
  is_collected_reverse?: boolean;
}

interface SetProgressProps {
  cards: Card[];
}

export default function SetProgress({ cards }: SetProgressProps) {
  // 1. Standard Set: Csak az alap/secret kártyák
  const totalBase = cards.length;
  const collectedBase = cards.filter((c) => c.is_collected_base).length;

  // 2. Mastery Set: Alap lapok + az összes elérhető Reverse Holo változat
  const totalReversePossible = cards.filter((c) => c.has_reverse_holo).length;
  const totalMastery = totalBase + totalReversePossible;

  const collectedReverse = cards.filter((c) => c.is_collected_reverse).length;
  const collectedMastery = collectedBase + collectedReverse;

  const basePercentage = totalBase > 0 ? Math.round((collectedBase / totalBase) * 100) : 0;
  const reversePercentage = totalReversePossible > 0 ? Math.round((collectedReverse / totalReversePossible) * 100) : 0;
  const masteryPercentage = totalMastery > 0 ? Math.round((collectedMastery / totalMastery) * 100) : 0;

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 text-white shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-emerald-400">Set-Status</h2>
      
      <div className="space-y-4">
        {/* Standard Set */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-slate-300">Base Set (Base & Secret Karten)</span>
            <span className="text-slate-400">{collectedBase} / {totalBase} ({basePercentage}%)</span>
          </div>
          <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${basePercentage}%` }}></div>
          </div>
        </div>

        {/* Reverse Holo külön számláló */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-slate-300">Reverse Holo Karten</span>
            <span className="text-slate-400">{collectedReverse} / {totalReversePossible} ({reversePercentage}%)</span>
          </div>
          <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${reversePercentage}%` }}></div>
          </div>
        </div>

        {/* Mastery Set */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-amber-400">Mastery Set (Alle Karten + Reverse Variante)</span>
            <span className="text-amber-300 font-bold">{collectedMastery} / {totalMastery} ({masteryPercentage}%)</span>
          </div>
          <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div className="bg-amber-400 h-2.5 rounded-full transition-all duration-300" style={{ width: `${masteryPercentage}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}