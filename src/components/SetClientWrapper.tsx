'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import CardList, { Card, SetDetails } from './CardList';
import CardModal, { CardModalData } from './CardModal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ExtendedCard extends Card {
  series?: string;
  user_collections_raw?: { 
    card_id: string; 
    quantity_base?: number; 
    quantity_reverse?: number; 
    user_id: string 
  }[];
}

interface SetItem {
  id: string | number;
  name?: string;
  name_de?: string;
  code?: string;
  series?: string;
}

interface SetClientWrapperProps {
  initialCards: ExtendedCard[];
  setDetails?: SetDetails;
  allSets?: SetItem[];
  initialSetId?: string;
  initialQuery?: string;
  hideFilters?: boolean;
}

export default function SetClientWrapper({ 
  initialCards, 
  setDetails, 
  allSets = [], 
  initialSetId = 'ALL', 
  initialQuery = '',
  hideFilters = false
}: SetClientWrapperProps) {
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardModalData | null>(null);

  // --- SZŰRŐ ÁLLAPOTOK ---
  const [searchTerm, setSearchTerm] = useState<string>(initialQuery);
  
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>(
    initialSetId && initialSetId !== 'ALL' ? [String(initialSetId)] : []
  );

  const [openSeries, setOpenSeries] = useState<Record<string, boolean>>({});
  const [rarityFilter, setRarityFilter] = useState<string>('ALL');
  const [collectionFilter, setCollectionFilter] = useState<'ALL' | 'OWNED' | 'MISSING'>('ALL');

  // --- KÜLSŐ / MODÁL KERESÉS SZINKRONIZÁLÁSA ---
  useEffect(() => {
    setSearchTerm(initialQuery);
  }, [initialQuery]);

  const groupedSets = useMemo(() => {
    const groups: Record<string, SetItem[]> = {};
    allSets.forEach((set) => {
      const seriesName = set.series || 'Egyéb sorozatok';
      if (!groups[seriesName]) groups[seriesName] = [];
      groups[seriesName].push(set);
    });
    return groups;
  }, [allSets]);

  const mapCardWithUserCollection = (cardList: ExtendedCard[], currentUserId: string | null) => {
    return cardList.map((card: ExtendedCard) => {
      const myItem = currentUserId && card.user_collections_raw
        ? card.user_collections_raw.find((uc) => uc.user_id === currentUserId)
        : null;

      const qBase = card.quantity_base ?? myItem?.quantity_base ?? (card.is_collected_base ? 1 : 0);
      const qReverse = card.quantity_reverse ?? myItem?.quantity_reverse ?? (card.is_collected_reverse ? 1 : 0);

      return {
        ...card,
        quantity_base: qBase,
        quantity_reverse: qReverse,
        is_collected_base: qBase > 0,
        is_collected_reverse: qReverse > 0,
      };
    });
  };

  useEffect(() => {
    async function loadUserAndInitCards() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setCards(mapCardWithUserCollection(initialCards, user.id));
      } else {
        setCards(mapCardWithUserCollection(initialCards, null));
      }
    }

    loadUserAndInitCards();
  }, [initialCards]);

  useEffect(() => {
    setCards(mapCardWithUserCollection(initialCards, userId));
  }, [initialCards, userId]);

  useEffect(() => {
    if (!initialSetId || initialSetId === 'ALL') {
      setSelectedSetIds([]);
    } else {
      setSelectedSetIds([String(initialSetId)]);
    }
  }, [initialSetId]);

  const toggleSeriesOpen = (seriesName: string) => {
    setOpenSeries((prev) => ({ ...prev, [seriesName]: !prev[seriesName] }));
  };

  const handleSelectAll = () => {
    setSelectedSetIds([]);
  };

  const handleToggleSeries = (seriesName: string) => {
    const seriesSetIds = (groupedSets[seriesName] || []).map((s) => String(s.id));
    const allSelected = seriesSetIds.every((id) => selectedSetIds.includes(id));

    if (allSelected) {
      setSelectedSetIds((prev) => prev.filter((id) => !seriesSetIds.includes(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedSetIds, ...seriesSetIds]));
      setSelectedSetIds(newSelected);
    }
  };

  const handleToggleSet = (setId: string | number) => {
    const idStr = String(setId);
    setSelectedSetIds((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    );
  };

  const revertCardState = (
    cardId: string, 
    type: 'base' | 'reverse', 
    origQty: number, 
    origCollected: boolean
  ) => {
    const isBase = type === 'base';

    setCards((prevCards) =>
      prevCards.map((c) => {
        if (c.id === cardId) {
          return {
            ...c,
            [isBase ? 'quantity_base' : 'quantity_reverse']: origQty,
            [isBase ? 'is_collected_base' : 'is_collected_reverse']: origCollected,
          };
        }
        return c;
      })
    );

    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard((prev: any) => ({
        ...prev,
        [isBase ? 'quantity_base' : 'quantity_reverse']: origQty,
        [isBase ? 'is_collected_base' : 'is_collected_reverse']: origCollected,
      }));
    }
  };

  const handleToggleCard = async (
    cardId: string, 
    type: 'base' | 'reverse', 
    explicitQuantity?: number
  ) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      alert('Hiba: Nem található bejelentkezett felhasználó!');
      return;
    }

    const isBase = type === 'base';
    const targetCard = cards.find((c) => c.id === cardId);
    if (!targetCard) return;

    const origQty = isBase ? (targetCard.quantity_base ?? 0) : (targetCard.quantity_reverse ?? 0);
    const origCollected = isBase ? Boolean(targetCard.is_collected_base) : Boolean(targetCard.is_collected_reverse);

    let nextQty: number;
    if (typeof explicitQuantity === 'number') {
      nextQty = Math.max(0, explicitQuantity);
    } else {
      nextQty = origQty > 0 ? 0 : 1;
    }

    const nextCollected = nextQty > 0;

    setCards((prevCards) =>
      prevCards.map((c) => {
        if (c.id === cardId) {
          return {
            ...c,
            [isBase ? 'quantity_base' : 'quantity_reverse']: nextQty,
            [isBase ? 'is_collected_base' : 'is_collected_reverse']: nextCollected,
          };
        }
        return c;
      })
    );

    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard((prev: any) => ({
        ...prev,
        [isBase ? 'quantity_base' : 'quantity_reverse']: nextQty,
        [isBase ? 'is_collected_base' : 'is_collected_reverse']: nextCollected,
      }));
    }

    try {
      const qBase = isBase ? nextQty : (targetCard.quantity_base ?? 0);
      const qReverse = !isBase ? nextQty : (targetCard.quantity_reverse ?? 0);

      if (qBase === 0 && qReverse === 0) {
        const { error } = await supabase
          .from('user_collections')
          .delete()
          .eq('user_id', user.id)
          .eq('card_id', cardId);

        if (error) {
          revertCardState(cardId, type, origQty, origCollected);
        }
      } else {
        const { data: existingRecords } = await supabase
          .from('user_collections')
          .select('id')
          .eq('user_id', user.id)
          .eq('card_id', cardId);

        if (existingRecords && existingRecords.length > 0) {
          const { error } = await supabase
            .from('user_collections')
            .update({
              quantity_base: qBase,
              quantity_reverse: qReverse,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('card_id', cardId);

          if (error) {
            revertCardState(cardId, type, origQty, origCollected);
          }
        } else {
          const { error } = await supabase
            .from('user_collections')
            .insert({
              user_id: user.id,
              card_id: cardId,
              quantity_base: qBase,
              quantity_reverse: qReverse,
              updated_at: new Date().toISOString(),
            });

          if (error) {
            revertCardState(cardId, type, origQty, origCollected);
          }
        }
      }
    } catch (err) {
      revertCardState(cardId, type, origQty, origCollected);
    }
  };

  const handleCardClick = (card: Card) => {
    setSelectedCard({
      ...card,
      set_id: card.set_id || setDetails?.id,
      set_name: card.set_name || setDetails?.name_de || setDetails?.name || setDetails?.code,
    });
  };

  const availableRarities = useMemo(() => {
    const setOfRarities = new Set<string>();
    cards.forEach((c) => {
      if (c.rarity) setOfRarities.add(c.rarity);
    });
    return Array.from(setOfRarities).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (!hideFilters) {
        const isAllSetsSelected = selectedSetIds.length === 0;
        if (!isAllSetsSelected && card.set_id && !selectedSetIds.includes(String(card.set_id))) {
          return false;
        }
      }

      const term = searchTerm.toLowerCase().trim();
      if (term) {
        const matchesName = card.name?.toLowerCase().includes(term);
        const matchesNameDe = card.name_de?.toLowerCase().includes(term);
        const matchesTitle = card.title?.toLowerCase().includes(term);
        const matchesSetName = card.set_name?.toLowerCase().includes(term);
        const matchesNumber = String(card.card_number || '').includes(term);

        if (!matchesName && !matchesNameDe && !matchesTitle && !matchesSetName && !matchesNumber) {
          return false;
        }
      }

      if (!hideFilters) {
        if (rarityFilter !== 'ALL' && card.rarity !== rarityFilter) {
          return false;
        }

        const isOwned = Boolean(
          (card.quantity_base && card.quantity_base > 0) || 
          (card.quantity_reverse && card.quantity_reverse > 0) ||
          card.is_collected_base || 
          card.is_collected_reverse
        );

        if (collectionFilter === 'OWNED' && !isOwned) {
          return false;
        }
        if (collectionFilter === 'MISSING' && isOwned) {
          return false;
        }
      }

      return true;
    });
  }, [cards, selectedSetIds, searchTerm, rarityFilter, collectionFilter, hideFilters]);

  const isAllSetsActive = selectedSetIds.length === 0;

  return (
    <div className="space-y-6">
      {/* --- SZŰRŐ ÉS KERESŐ MEZŐK (CSAK HA hideFilters HAMIS) --- */}
      {!hideFilters && (
        <div className="bg-slate-800/90 p-4 sm:p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Kártya / szett neve, sorszám..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs bg-slate-700 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div>
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500/80 transition-colors cursor-pointer"
              >
                <option value="ALL">✨ Összes ritkaság</option>
                {availableRarities.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value as 'ALL' | 'OWNED' | 'MISSING')}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500/80 transition-colors cursor-pointer"
              >
                <option value="ALL">🗂️ Összes kártya</option>
                <option value="OWNED">🟢 Csak ami megvan</option>
                <option value="MISSING">🔴 Csak ami hiányzik</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                📦 Szettek szűrése ({selectedSetIds.length > 0 ? `${selectedSetIds.length} szett kiválasztva` : 'Összes szett'})
              </span>
              {selectedSetIds.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  Szűrők törlése (Összes mutatása)
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              <button
                onClick={handleSelectAll}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isAllSetsActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'
                }`}
              >
                🌐 ÖSSZES SZETT MUTATÁSA ({allSets.length} szett)
              </button>

              {Object.entries(groupedSets).map(([seriesName, sets]) => {
                const seriesSetIds = sets.map((s) => String(s.id));
                const selectedCount = seriesSetIds.filter((id) => selectedSetIds.includes(id)).length;
                const isFullySelected = selectedCount === sets.length;
                const isPartiallySelected = selectedCount > 0 && !isFullySelected;
                const isOpen = !!openSeries[seriesName];

                return (
                  <div key={seriesName} className="border border-slate-700/60 rounded-xl bg-slate-900/40 overflow-hidden">
                    <div className="flex items-center justify-between p-2.5 bg-slate-800/50">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isFullySelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isPartiallySelected;
                          }}
                          onChange={() => handleToggleSeries(seriesName)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-400 cursor-pointer"
                        />
                        <button
                          onClick={() => toggleSeriesOpen(seriesName)}
                          className="font-bold text-xs text-slate-200 hover:text-amber-300 text-left flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{seriesName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({selectedCount > 0 ? `${selectedCount}/${sets.length}` : `${sets.length} szett`})
                          </span>
                        </button>
                      </div>

                      <button
                        onClick={() => toggleSeriesOpen(seriesName)}
                        className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 cursor-pointer"
                      >
                        {isOpen ? '▲' : '▼'}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 border-t border-slate-800 bg-slate-950/40">
                        {sets.map((set) => {
                          const setIdStr = String(set.id);
                          const isChecked = selectedSetIds.includes(setIdStr);

                          return (
                            <label
                              key={set.id}
                              className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                                isChecked
                                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSet(set.id)}
                                className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-400 cursor-pointer"
                              />
                              <span className="truncate">{set.name_de || set.name} {set.code ? `(${set.code})` : ''}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60 text-xs text-slate-400">
            <div>
              Találatok: <span className="font-bold text-slate-100">{filteredCards.length}</span> / {cards.length} kártya
            </div>
          </div>
        </div>
      )}

      {/* --- KÁRTYALISTA MEGJELENÍTÉSE --- */}
      {filteredCards.length === 0 ? (
        <div className="bg-slate-800/40 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 space-y-3">
          <span className="text-4xl block">🔍</span>
          <p className="font-semibold text-lg text-slate-300">Nem található a feltételeknek megfelelő kártya</p>
          <p className="text-xs text-slate-500">Próbáld meg átváltani a szettet a fenti sávban!</p>
        </div>
      ) : (
        <CardList
          cards={filteredCards}
          setDetails={setDetails || {
            id: 'ALL',
            name_de: 'Összes szett',
            series: '',
            code: '',
            printed_code: '',
            release_date: '',
            total_base_cards: 0,
            total_secret_cards: 0,
            total_cards: filteredCards.length,
          }}
          onToggleCard={handleToggleCard}
          onCardClick={handleCardClick}
        />
      )}

      {/* --- MODAL INTEGRÁCIÓ --- */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onToggleCard={handleToggleCard}
        />
      )}
    </div>
  );
}