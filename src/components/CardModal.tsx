'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export interface CardModalData {
  id: string;
  name_de?: string;
  name?: string;
  title?: string;
  supertype?: string; // "Pokémon", "Trainer", "Energy"
  rarity?: string | null;
  card_number?: string | number | null;
  image_de_url?: string;
  image_url?: string;
  set_id?: string | number | null;
  set_name?: string;

  // Gyűjtemény állapota
  is_collected_base?: boolean;
  is_collected_reverse?: boolean;
  quantity_base?: number;
  quantity_reverse?: number;

  // TCGdex specifikus mezők
  types?: string[];
  hp?: number | string;
  evolveFrom?: string;
  stage?: string;
  description?: string;
  abilities?: Array<{
    name: string;
    type?: string;
    effect?: string;
  }>;
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
}

interface CardModalProps {
  card: CardModalData | null;
  onClose: () => void;
  // ✨ Támogatja mind a státusz átváltást, mind a konkrét mennyiség beállítását
  onToggleCard?: (cardId: string, type: 'base' | 'reverse', quantity?: number) => void;
}

export default function CardModal({ card, onClose, onToggleCard }: CardModalProps) {
  const [fullCard, setFullCard] = useState<CardModalData | null>(card);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setFullCard(card);

    if (!card?.id) return;

    const isMissingDetails = !card.abilities && !card.description && (!card.attacks || card.attacks.length === 0);

    if (isMissingDetails) {
      setLoading(true);
      
      fetch(`https://api.tcgdex.net/v2/de/cards/${card.id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Német adatok nem találhatók');
          return res.json();
        })
        .catch(() => {
          return fetch(`https://api.tcgdex.net/v2/en/cards/${card.id}`).then((res) => res.json());
        })
        .then((data) => {
          if (data) {
            setFullCard((prev) => ({
              ...prev,
              ...card,
              name_de: data.name || prev?.name_de,
              supertype: data.category || prev?.supertype,
              hp: data.hp,
              types: data.types,
              stage: data.stage,
              evolveFrom: data.evolveFrom,
              description: data.description || data.effect,
              abilities: data.abilities?.map((ab: any) => ({
                name: ab.name,
                type: ab.type,
                effect: ab.effect,
              })),
              attacks: data.attacks?.map((att: any) => ({
                name: att.name,
                cost: att.cost,
                damage: att.damage,
                effect: att.effect,
              })),
              weaknesses: data.weaknesses,
              retreat: data.retreat,
              regulationMark: data.regulationMark,
              rarity: data.rarity || prev?.rarity,
              card_number: data.localId || prev?.card_number,
              image_de_url: data.image ? `${data.image}/high.webp` : prev?.image_de_url,
            }));
          }
        })
        .catch((err) => console.error('Hiba a kártya részleteinek lekérésekor:', err))
        .finally(() => setLoading(false));
    }
  }, [card]);

  if (!card) return null;

  const activeCard = fullCard || card;
  const displayName = activeCard.name_de || activeCard.name || activeCard.title || 'Ismeretlen kártya';
  const imageUrl = activeCard.image_de_url || activeCard.image_url;
  const supertype = activeCard.supertype || 'Pokémon';

  // Mennyiségek kiszámítása (ha még nincs benne, akkor 0)
  const qBase = activeCard.quantity_base ?? (activeCard.is_collected_base ? 1 : 0);
  const qReverse = activeCard.quantity_reverse ?? (activeCard.is_collected_reverse ? 1 : 0);

  // Mennyiség frissítése
  const updateQuantity = (type: 'base' | 'reverse', newQty: number) => {
    const finalQty = Math.max(0, newQty);

    setFullCard((prev) => {
      if (!prev) return prev;
      if (type === 'base') {
        return {
          ...prev,
          quantity_base: finalQty,
          is_collected_base: finalQty > 0,
        };
      } else {
        return {
          ...prev,
          quantity_reverse: finalQty,
          is_collected_reverse: finalQty > 0,
        };
      }
    });

    if (onToggleCard) {
      onToggleCard(activeCard.id, type, finalQty);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-2xl h-[90vh] max-h-[680px] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* BEZÁRÁS GOMB */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg border border-slate-600 transition-all shadow-md cursor-pointer"
          title="Bezárás"
        >
          ✕
        </button>

        {/* BAL OLDAL: KÁRTYA KÉPE ÉS GYŰJTEMÉNY VEZÉRLŐK */}
        <div className="md:w-1/2 h-auto md:h-full bg-slate-950 p-4 md:p-6 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-slate-800 shrink-0 overflow-y-auto">
          
          {/* Képtároló */}
          <div className="flex-1 flex items-center justify-center w-full min-h-[200px] my-2">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={displayName} 
                className="max-h-[300px] md:max-h-[380px] max-w-full h-auto w-auto object-contain rounded-xl shadow-2xl hover:scale-105 transition-transform duration-300" 
              />
            ) : (
              <div className="w-64 h-80 bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-slate-800 p-4 text-center">
                <span className="text-5xl mb-2">🃏</span>
                <span className="text-slate-400 text-xs font-mono">{activeCard.id}</span>
              </div>
            )}
          </div>

          {/* ✨ KÁRTYA KÉP ALATTI INKREMENTÁLHATÓ SZÁMLÁLÓ VEZÉRLŐK */}
          <div className="w-full bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-2 mt-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              📦 Gyűjtemény állapota
            </span>

            <div className="grid grid-cols-2 gap-2">
              
              {/* NORMAL / BASE KÁRTYA VEZÉRLŐ */}
              <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-700/80 bg-slate-800/40">
                <span className="text-[10px] font-bold text-slate-400 mb-1">Normál (Base)</span>
                
                {qBase > 0 ? (
                  /* Ha már bent van: SZÁMLÁLÓ (- 1 +) */
                  <div className="flex items-center justify-between w-full bg-emerald-950/60 border border-emerald-500/50 rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity('base', qBase - 1)}
                      className="w-7 h-7 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded-md font-extrabold text-sm flex items-center justify-center transition-colors cursor-pointer"
                      title="Csökkentés"
                    >
                      -
                    </button>
                    <span className="font-black text-emerald-300 text-sm px-1">
                      {qBase} db
                    </span>
                    <button
                      onClick={() => updateQuantity('base', qBase + 1)}
                      className="w-7 h-7 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded-md font-extrabold text-sm flex items-center justify-center transition-colors cursor-pointer"
                      title="Növelés"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  /* Ha még nincs bent: HOZZÁADÁS GOMB */
                  <button
                    onClick={() => updateQuantity('base', 1)}
                    className="w-full py-1.5 bg-slate-800 hover:bg-emerald-600/30 hover:border-emerald-500/60 border border-slate-700 text-slate-300 hover:text-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    + Hozzáadás
                  </button>
                )}
              </div>

              {/* REVERSE HOLO KÁRTYA VEZÉRLŐ */}
              <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-700/80 bg-slate-800/40">
                <span className="text-[10px] font-bold text-purple-400 mb-1">Reverse Holo</span>
                
                {qReverse > 0 ? (
                  /* Ha már bent van: SZÁMLÁLÓ (- 1 +) */
                  <div className="flex items-center justify-between w-full bg-purple-950/60 border border-purple-500/50 rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity('reverse', qReverse - 1)}
                      className="w-7 h-7 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-md font-extrabold text-sm flex items-center justify-center transition-colors cursor-pointer"
                      title="Csökkentés"
                    >
                      -
                    </button>
                    <span className="font-black text-purple-300 text-sm px-1">
                      {qReverse} db
                    </span>
                    <button
                      onClick={() => updateQuantity('reverse', qReverse + 1)}
                      className="w-7 h-7 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-md font-extrabold text-sm flex items-center justify-center transition-colors cursor-pointer"
                      title="Növelés"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  /* Ha még nincs bent: HOZZÁADÁS GOMB */
                  <button
                    onClick={() => updateQuantity('reverse', 1)}
                    className="w-full py-1.5 bg-slate-800 hover:bg-purple-600/30 hover:border-purple-500/60 border border-slate-700 text-slate-300 hover:text-purple-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    + Hozzáadás
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* JOBB OLDAL: KÁRTYA ADATAI */}
        <div className="md:w-1/2 flex-1 min-h-0 h-1/2 md:h-full p-6 flex flex-col overflow-y-auto space-y-4 custom-scrollbar">
          
          {/* FEJLÉC */}
          <div className="shrink-0">
            <div className="flex items-start justify-between gap-2 pr-8">
              {/* ✨ MODOSÍTÁS: Átadunk egy set=ALL paramétert az URL-ben, és megnyitáskor bezárjuk a modált */}
              <Link
                href={`/search?query=${encodeURIComponent(displayName)}&set=ALL`}
                onClick={onClose}
                className="text-2xl font-black text-amber-400 hover:text-amber-300 transition-colors hover:underline flex items-center gap-1.5"
                title="Keresés az összes azonos nevű kártyára az összes szettben"
              >
                <span>{displayName}</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-normal shrink-0">
                  🔍 Keresés
                </span>
              </Link>
            </div>

            {/* Szett Link & Típus jelzés */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-300 font-semibold">
                {supertype}
              </span>

              {activeCard.types && activeCard.types.length > 0 && (
                <span className="bg-blue-950 border border-blue-800/60 text-blue-300 px-2.5 py-1 rounded-lg font-bold">
                  {activeCard.types.join(', ')}
                </span>
              )}

              {activeCard.set_id && (
                <Link
                  href={`/?set=${activeCard.set_id}`}
                  onClick={onClose}
                  className="bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 px-2.5 py-1 rounded-lg font-bold transition-all"
                >
                  📦 {activeCard.set_name || `Szett (#${activeCard.set_id})`}
                </Link>
              )}
            </div>
          </div>

          <hr className="border-slate-800 shrink-0" />

          {/* BETÖLTÉS JELZŐ */}
          {loading ? (
            <div className="py-8 text-center space-y-2 my-auto">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-400 border-t-transparent"></div>
              <p className="text-xs text-slate-400 animate-pulse">Részletek betöltése...</p>
            </div>
          ) : (
            <>
              {/* POKÉMON SPECIFIKUS ADATOK (HP, Stage, Ebből fejlődik) */}
              {(activeCard.hp || activeCard.stage || activeCard.evolveFrom) && (
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 shrink-0">
                  {activeCard.hp && (
                    <div>
                      <span className="text-slate-400 block font-bold">HP</span>
                      <span className="text-amber-400 font-black text-sm">{activeCard.hp} HP</span>
                    </div>
                  )}
                  {activeCard.stage && (
                    <div>
                      <span className="text-slate-400 block font-bold">Fázis (Stage)</span>
                      <span className="text-slate-200 font-semibold">{activeCard.stage}</span>
                    </div>
                  )}
                  {activeCard.evolveFrom && (
                    <div className="col-span-2 pt-1 border-t border-slate-700/40 flex items-center justify-between">
                      <span className="text-slate-400">Ebből fejlődik: </span>
                      {/* ✨ MÓDOSÍTÁS: Az evolveFrom keresésnél is eltávolítottuk a setId korlátozást, és betettük a set=ALL-t */}
                      <Link
                        href={`/search?query=${encodeURIComponent(activeCard.evolveFrom)}&set=ALL`}
                        onClick={onClose}
                        className="text-amber-300 font-bold hover:text-amber-400 hover:underline flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs transition-all"
                        title={`Keresés az összes szettben: ${activeCard.evolveFrom}`}
                      >
                        <span>{activeCard.evolveFrom}</span>
                        <span className="text-[10px]">↗</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* ✨ KÉPESSÉGEK (Fähigkeiten / Ability) */}
              {activeCard.abilities && activeCard.abilities.length > 0 && (
                <div className="space-y-2 shrink-0">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                    <span>✨</span> Képesség (Fähigkeit)
                  </h4>
                  {activeCard.abilities.map((ability, index) => (
                    <div key={index} className="bg-red-950/30 border border-red-500/30 p-3 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-red-300 text-sm">{ability.name}</span>
                        {ability.type && (
                          <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded uppercase font-bold border border-red-500/30">
                            {ability.type}
                          </span>
                        )}
                      </div>
                      {ability.effect && (
                        <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-red-500/20">
                          {ability.effect}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TÁMADÁSOK (Attacks) */}
              {activeCard.attacks && activeCard.attacks.length > 0 && (
                <div className="space-y-2 shrink-0">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Támadások</h4>
                  {activeCard.attacks.map((attack, index) => (
                    <div key={index} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                      <div className="flex justify-between items-center font-bold text-sm">
                        <div className="flex items-center gap-2">
                          {attack.cost && attack.cost.length > 0 && (
                            <span className="text-[10px] bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                              [{attack.cost.join(', ')}]
                            </span>
                          )}
                          <span className="text-slate-100">{attack.name}</span>
                        </div>
                        {attack.damage && (
                          <span className="text-amber-400 font-black">{attack.damage}</span>
                        )}
                      </div>
                      {attack.effect && (
                        <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-700/50">
                          {attack.effect}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* GYENGESÉG ÉS VISSZAVONULÁS */}
              {(activeCard.weaknesses || activeCard.retreat !== undefined) && (
                <div className="flex gap-4 text-xs bg-slate-800/30 p-2.5 rounded-xl border border-slate-800 shrink-0">
                  {activeCard.weaknesses && activeCard.weaknesses.length > 0 && (
                    <div>
                      <span className="text-slate-400 block font-bold">Gyengeség</span>
                      <span className="text-red-400 font-bold">
                        {activeCard.weaknesses.map((w) => `${w.type} ${w.value}`).join(', ')}
                      </span>
                    </div>
                  )}
                  {activeCard.retreat !== undefined && (
                    <div>
                      <span className="text-slate-400 block font-bold">Visszavonulás</span>
                      <span className="text-slate-200 font-bold">{activeCard.retreat} Energy</span>
                    </div>
                  )}
                </div>
              )}

              {/* 📝 LEÍRÁS / TRAINER EFFEKT / FLAVOR TEXT */}
              {activeCard.description && (
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs leading-relaxed text-slate-200 shrink-0">
                  <span className="text-amber-400 font-bold block mb-1">Leírás / Effekt:</span>
                  <p>{activeCard.description}</p>
                </div>
              )}
            </>
          )}

          {/* EXTRA INFÓK */}
          <div className="pt-2 flex flex-wrap justify-between items-center text-[11px] text-slate-500 border-t border-slate-800 mt-auto shrink-0">
            <span>Sorszám: #{activeCard.card_number || activeCard.id}</span>
            <span>Ritkaság: {activeCard.rarity || 'Normál'}</span>
            {activeCard.regulationMark && <span>Mark: {activeCard.regulationMark}</span>}
          </div>

        </div>
      </div>
    </div>
  );
}