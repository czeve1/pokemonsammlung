'use client';

import React, { useState } from 'react';
import { CardModalData } from './CardModal';

export interface Card extends CardModalData {
  id: string;
  set_id?: string;
  name?: string;
  name_de?: string;
  name_en?: string;
  card_number?: string | number | null;
  rarity?: string | null;
  image_url?: string;
  image_de_url?: string;
  supertype?: string;
  types?: string[];
  hp?: number | string;
  evolveFrom?: string;
  stage?: string;
  description?: string;
  attacks?: Array<{
    name: string;
    cost?: string[];
    damage?: string | number;
    effect?: string;
  }>;
  weaknesses?: Array<{
    type: string;
    value: string;
  }>;
  retreat?: number;
  regulationMark?: string;
  is_collected_base?: boolean;
  is_collected_reverse?: boolean;
  has_reverse_holo?: boolean;
}

export interface SetDetails {
  id: string;
  name?: string;
  name_de?: string;
  series?: string;
  code?: string;
  printed_code?: string;
  release_date?: string;
  released_at?: string;
  releaseDate?: string;
  total_base_cards?: number;
  total_secret_cards?: number;
  total_cards?: number;
  [key: string]: any;
}

export interface CardListProps {
  setDetails?: SetDetails; // <-- Itt lett opcionálissá téve (?)
  initialCards?: Card[];
  cards?: Card[];
  onToggleCard?: (cardId: string, type: 'base' | 'reverse') => void;
  onCardClick?: (card: Card) => void;
}

export default function CardList({
  setDetails,
  initialCards = [],
  cards = initialCards,
  onToggleCard,
  onCardClick,
}: CardListProps) {
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'collected' | 'missing'>('all');

  const rawReleaseDate = 
    setDetails?.release_date || 
    setDetails?.released_at || 
    setDetails?.releaseDate || 
    setDetails?.date;

  const formatDate = (dateValue?: any) => {
    if (!dateValue) return 'Nincs megadva';
    if (typeof dateValue === 'string') {
      const clean = dateValue.split('T')[0];
      if (clean.includes('-')) {
        const [year, month, day] = clean.split('-');
        if (year && month && day) {
          return `${year}.${month}.${day}`;
        }
      }
      return clean;
    }
    return String(dateValue);
  };

  const hasPromoCards = cards.some((c) => c.rarity?.toLowerCase() === 'promo');
  const secondaryTypeLabel = hasPromoCards ? 'Jumbo' : 'Reverse';
  const secondaryTypeFullLabel = hasPromoCards ? 'Jumbo kártyák' : 'Reverse kártyák';

  const baseLimit = setDetails?.total_base_cards ?? 0;
  const isSecretCard = (card: Card) => {
    const num = parseInt(String(card.card_number || '0'), 10);
    return baseLimit > 0 && num > baseLimit;
  };

  const baseCardsList = cards.filter((c) => !isSecretCard(c));
  const secretCardsList = cards.filter((c) => isSecretCard(c));

  const baseTotal = setDetails?.total_base_cards ?? baseCardsList.length ?? 0;
  const baseCollected = baseCardsList.filter((c) => c.is_collected_base || c.is_collected_reverse).length;
  const basePercent = baseTotal > 0 ? Math.round((baseCollected / baseTotal) * 100) : 0;

  const secretTotal = setDetails?.total_secret_cards ?? secretCardsList.length ?? 0;
  const secretCollected = secretCardsList.filter((c) => c.is_collected_base || c.is_collected_reverse).length;
  const secretPercent = secretTotal > 0 ? Math.round((secretCollected / secretTotal) * 100) : 0;
  const hasSecretCards = secretTotal > 0;

  const totalCardsTotal = setDetails?.total_cards ?? (baseTotal + secretTotal);
  const totalCardsCollected = cards.filter((c) => c.is_collected_base || c.is_collected_reverse).length;
  const totalCardsPercent = totalCardsTotal > 0 ? Math.round((totalCardsCollected / totalCardsTotal) * 100) : 0;

  const reverseEligibleCards = cards.filter((c) => {
    if (c.has_reverse_holo !== true) return false;
    if (hasPromoCards) {
      return c.rarity?.toLowerCase() === 'promo';
    }
    return true;
  });

  const reverseTotal = reverseEligibleCards.length;
  const reverseCollected = reverseEligibleCards.filter((c) => c.is_collected_reverse).length;
  const reversePercent = reverseTotal > 0 ? Math.round((reverseCollected / reverseTotal) * 100) : 0;

  const masteryTotal = totalCardsTotal + reverseTotal;
  const totalBaseCollectedDb = cards.filter((c) => c.is_collected_base).length;
  const totalReverseCollectedDb = cards.filter((c) => c.is_collected_reverse).length;
  const masteryCollected = totalBaseCollectedDb + totalReverseCollectedDb;
  const masteryPercent = masteryTotal > 0 ? Math.round((masteryCollected / masteryTotal) * 100) : 0;

  const rarities = Array.from(
    new Set(cards.map((c) => c.rarity).filter((r): r is string => Boolean(r)))
  );

  const rarityStats = rarities.map((rarity) => {
    const rarityCards = cards.filter((c) => c.rarity === rarity);
    const total = rarityCards.length;
    const collected = rarityCards.filter((c) => c.is_collected_base || c.is_collected_reverse).length;
    const percent = total > 0 ? Math.round((collected / total) * 100) : 0;
    return { rarity, total, collected, percent };
  });

  const filteredCards = cards.filter((card) => {
    const cardName = card.name_de || card.name || card.name_en || '';
    const cardNumber = card.card_number ? card.card_number.toString() : '';

    const matchesSearch =
      cardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cardNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const isCollected = card.is_collected_base || card.is_collected_reverse;

    if (!matchesSearch) return false;
    if (filter === 'collected') return isCollected;
    if (filter === 'missing') return !isCollected;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
      {/* FEJLÉC ÉS STATISZTIKÁK */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {setDetails?.name_de || setDetails?.name || 'Ismeretlen Szett'}
            </h1>
            {setDetails?.printed_code && (
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs sm:text-sm font-black px-3 py-1 rounded-lg tracking-wider uppercase">
                {setDetails.printed_code}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsStatsOpen(!isStatsOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all"
          >
            <span>ℹ️ Szett Statisztikák & Részletek</span>
            <span className="text-[10px] text-slate-400">{isStatsOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {isStatsOpen && (
          <div className="pt-4 border-t border-slate-800 space-y-6 animate-fadeIn">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1">
                <span>📅 Megjelenés:</span>
                <span className="text-slate-200 font-bold">{formatDate(rawReleaseDate)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 uppercase text-[10px] font-bold">ID:</span>
                <span className="font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-bold">
                  {setDetails?.id || 'N/A'}
                </span>
              </div>
              {setDetails?.series && (
                <>
                  <span>•</span>
                  <div className="text-amber-500 font-bold">{setDetails.series}</div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">Gyűjtemény Haladás</h3>
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/60 text-xs">
                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">
                    {hasSecretCards ? 'Alap szett (Secret nélkül)' : 'Alap szett'}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-200">{baseCollected} / {baseTotal}</span>
                    <span className="font-bold text-emerald-400 min-w-[45px] text-right">{basePercent}%</span>
                  </div>
                </div>

                {hasSecretCards && (
                  <>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-300 font-medium">Secret lapok</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-200">{secretCollected} / {secretTotal}</span>
                        <span className="font-bold text-amber-400 min-w-[45px] text-right">{secretPercent}%</span>
                      </div>
                    </div>
                    <div className="p-3 flex items-center justify-between bg-slate-900/40">
                      <span className="text-slate-200 font-bold">Teljes Alap Szett (Secret-tel)</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-100">{totalCardsCollected} / {totalCardsTotal}</span>
                        <span className="font-bold text-yellow-400 min-w-[45px] text-right">{totalCardsPercent}%</span>
                      </div>
                    </div>
                  </>
                )}

                {reverseTotal > 0 && (
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-300 font-medium">{secondaryTypeFullLabel}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-200">{reverseCollected} / {reverseTotal}</span>
                      <span className="font-bold text-amber-400 min-w-[45px] text-right">{reversePercent}%</span>
                    </div>
                  </div>
                )}

                <div className="p-3 flex items-center justify-between bg-amber-500/10 border-t-2 border-amber-500/40">
                  <span className="text-amber-400 font-black">Teljes Mastery Szett</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-amber-300">{masteryCollected} / {masteryTotal}</span>
                    <span className="font-black text-amber-400 min-w-[45px] text-right">{masteryPercent}%</span>
                  </div>
                </div>
              </div>
            </div>

            {rarityStats.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">Haladás Ritkaság Szerint</h3>
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/60 text-xs">
                  {rarityStats.map((item) => (
                    <div key={item.rarity} className="p-2.5 flex items-center justify-between">
                      <span className="text-slate-300 font-medium">{item.rarity}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-400 text-[11px]">{item.collected} / {item.total}</span>
                        <span className="font-bold text-emerald-400 min-w-[45px] text-right">{item.percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KÁRTYÁK LISTÁJA */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2 flex-wrap">
              <span>Kártyák</span>
              <span className="text-xs bg-slate-800 text-amber-400 border border-slate-700 px-3 py-1 rounded-full font-mono font-bold">
                {totalCardsCollected} / {totalCardsTotal} gyűjtve ({totalCardsPercent}%)
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1 justify-end min-w-[280px]">
            <div className="relative flex-1 max-w-xs min-w-[180px]">
              <input
                type="text"
                placeholder="Keresés..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 text-xs hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filter === 'all' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Összes ({cards.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('collected')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filter === 'collected' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Megvan ({totalCardsCollected})
              </button>
              <button
                type="button"
                onClick={() => setFilter('missing')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filter === 'missing' ? 'bg-rose-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hiányzik ({cards.length - totalCardsCollected})
              </button>
            </div>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredCards.map((card) => {
            const isCollected = card.is_collected_base || card.is_collected_reverse;
            const cardName = card.name_de || card.name || card.name_en || 'Névtelen kártya';
            const imageUrl = card.image_de_url || card.image_url;

            const isPromoCard = card.rarity?.toLowerCase() === 'promo';
            const showSecondaryButton =
              card.has_reverse_holo === true &&
              (!hasPromoCards || isPromoCard);

            return (
              <div
                key={card.id}
                className={`p-3 rounded-2xl border text-xs flex flex-col justify-between space-y-2 transition-all ${
                  isCollected
                    ? 'bg-slate-900 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                    : 'bg-slate-950/70 border-slate-800/80 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="font-bold text-slate-300">#{card.card_number || '???'}</span>
                  <span className="truncate max-w-[80px] text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                    {card.rarity || 'Common'}
                  </span>
                </div>

                {/* KÁRTYA KÉPE (RÁKATTINTVA MEGNYÍLIK A MODÁL) */}
                <div 
                  onClick={() => onCardClick && onCardClick(card)}
                  className="relative aspect-[2.5/3.5] w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 flex flex-col items-center justify-center p-2 text-center group cursor-pointer hover:border-amber-500/50 transition-all"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={cardName}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1 text-slate-600">
                      <span className="text-2xl">🃏</span>
                      <span className="text-[10px] font-mono text-slate-500">Nincs kép</span>
                    </div>
                  )}
                </div>

                <div 
                  onClick={() => onCardClick && onCardClick(card)}
                  className="font-bold text-slate-100 truncate text-xs pt-1 cursor-pointer hover:text-amber-400 transition-colors" 
                  title={cardName}
                >
                  {cardName}
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onToggleCard && onToggleCard(card.id, 'base')}
                    className={`py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                      !showSecondaryButton ? 'col-span-2' : ''
                    } ${
                      card.is_collected_base
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Base {card.is_collected_base ? '✓' : ''}
                  </button>

                  {showSecondaryButton && (
                    <button
                      type="button"
                      onClick={() => onToggleCard && onToggleCard(card.id, 'reverse')}
                      className={`py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                        card.is_collected_reverse
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {secondaryTypeLabel} {card.is_collected_reverse ? '✓' : ''}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}