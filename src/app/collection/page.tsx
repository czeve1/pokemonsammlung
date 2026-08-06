'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import CardModal, { CardModalData } from '../../components/CardModal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CardItem {
  id: string;
  name_de?: string;
  name?: string;
  title?: string;
  supertype?: string;
  rarity: string | null;
  set_id: string | null;
  card_number?: string | number | null;
  image_de_url?: string;
  image_url?: string;
  quantity_base: number;
  quantity_reverse: number;
  is_secret: boolean;
  types?: string[];
  hp?: string | number;
  evolveFrom?: string;
  stage?: string;
  description?: string;
  attacks?: any[];
  weaknesses?: any[];
  retreat?: any;
  regulationMark?: string;
}

interface SetInfo {
  id: string;
  name_de?: string;
  name?: string;
  title?: string;
  total_base_cards?: number;
}

function CollectionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const setIdFilter = searchParams.get('set');
  const mode = searchParams.get('mode') || 'user_only'; // 'user_only' | 'all_cards' | 'secrets_only'
  const targetUserIdFromUrl = searchParams.get('user');

  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [selectedOwnership, setSelectedOwnership] = useState<string>('ALL'); // 'ALL' | 'OWNED' | 'MISSING'

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [setInfo, setSetInfo] = useState<SetInfo | null>(null);
  const [rarityOptions, setRarityOptions] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isViewingOtherUser, setIsViewingOtherUser] = useState(false);
  
  // Kiválasztott kártya a modálhoz
  const [selectedCard, setSelectedCard] = useState<CardModalData | null>(null);

  useEffect(() => {
    async function fetchCollection() {
      setLoading(true);

      let activeUserId: string | null = targetUserIdFromUrl;

      // Ha nincs megadva user az URL-ben, akkor a bejelentkezett felhasználót nézzük
      if (!activeUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push('/login');
          return;
        }
        activeUserId = user.id;
        setIsViewingOtherUser(false);
      } else {
        setIsViewingOtherUser(true);
      }

      setUserId(activeUserId);

      // 2. Szett adatok lekérése (total_base_cards kell a secret vizsgálathoz!)
      let currentSetBaseCards = 0;
      if (setIdFilter) {
        const { data: setData } = await supabase
          .from('sets')
          .select('*')
          .eq('id', setIdFilter)
          .maybeSingle();

        if (setData) {
          setSetInfo(setData);
          currentSetBaseCards = setData.total_base_cards || 0;
        }
      }

      // 3. Ha NINCS kijelölve egy szett sem, kérjük le az összes szett total_base_cards mezőjét egy térképbe
      const allSetsMap = new Map<string, number>();
      if (!setIdFilter) {
        const { data: allSets } = await supabase.from('sets').select('id, total_base_cards');
        if (allSets) {
          allSets.forEach((s) => allSetsMap.set(String(s.id), s.total_base_cards || 0));
        }
      }

      // 4. User darabszámok lekérése (akár saját, akár más user ID-jával)
      const { data: colData } = await supabase
        .from('user_collections')
        .select('card_id, quantity_base, quantity_reverse')
        .eq('user_id', activeUserId);

      const userColMap = new Map<string, { base: number; reverse: number }>();
      (colData || []).forEach((row) => {
        userColMap.set(row.card_id, {
          base: row.quantity_base || 0,
          reverse: row.quantity_reverse || 0,
        });
      });

      // 5. Kártyák lekérése
      let cardsQuery = supabase.from('cards').select('*');
      if (setIdFilter) {
        cardsQuery = cardsQuery.eq('set_id', setIdFilter);
      }

      const { data: cardsData, error: cardsError } = await cardsQuery;

      if (cardsError) {
        console.error('Hiba a kártyák betöltésekor:', cardsError.message);
        setLoading(false);
        return;
      }

      let rawCards: CardItem[] = (cardsData || []).map((c: any) => {
        const qtyData = userColMap.get(c.id) || { base: 0, reverse: 0 };
        const num = parseInt(String(c.card_number || c.id).replace(/\D/g, ''), 10) || 0;
        
        // Szett alap kártyáinak száma
        const setBase = setIdFilter ? currentSetBaseCards : (allSetsMap.get(String(c.set_id)) || 0);
        const isSecret = setBase > 0 && num > setBase;

        return {
          ...c,
          quantity_base: qtyData.base,
          quantity_reverse: qtyData.reverse,
          is_secret: isSecret,
        };
      });

      // Sorbarendezés
      rawCards.sort((a, b) => {
        const numA = parseInt(String(a.card_number || a.id).replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.card_number || b.id).replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      // Módszer szerinti szűrés
      let filtered: CardItem[] = [];

      if (mode === 'user_only') {
        filtered = rawCards.filter((c) => (c.quantity_base + c.quantity_reverse) > 0);
      } else if (mode === 'secrets_only') {
        filtered = rawCards.filter((c) => c.is_secret);
      } else {
        filtered = rawCards;
      }

      // Ritkaság opciók a szűrőhöz
      const rarities = Array.from(new Set(filtered.map((c) => c.rarity).filter(Boolean))) as string[];
      setRarityOptions(rarities);

      setCards(filtered);
      setLoading(false);
    }

    fetchCollection();
  }, [setIdFilter, mode, targetUserIdFromUrl, router]);

  // --- KÁRTYA GYŰJTEMÉNY / DARABSZÁM KEZELÉSE ---
  const handleToggleCard = async (
    cardId: string, 
    type: 'base' | 'reverse', 
    explicitQuantity?: number
  ) => {
    // Ha más kollekcióját nézzük vendégként, nem módosíthatjuk
    if (isViewingOtherUser) {
      alert('Más felhasználó kollekcióját nem módosíthatod!');
      return;
    }

    if (!userId) {
      alert('Hiba: Nem található bejelentkezett felhasználó!');
      return;
    }

    const isBase = type === 'base';
    const targetCard = cards.find((c) => String(c.id) === String(cardId));
    if (!targetCard) return;

    const origBase = targetCard.quantity_base;
    const origReverse = targetCard.quantity_reverse;

    let nextQty: number;
    if (typeof explicitQuantity === 'number') {
      nextQty = Math.max(0, explicitQuantity);
    } else {
      const currentQty = isBase ? origBase : origReverse;
      nextQty = currentQty > 0 ? 0 : 1;
    }

    const nextBase = isBase ? nextQty : origBase;
    const nextReverse = !isBase ? nextQty : origReverse;

    // 1. OPTIMISTA UI FRISSÍTÉS (Lista)
    setCards((prevCards) =>
      prevCards.map((c) => {
        if (String(c.id) === String(cardId)) {
          return {
            ...c,
            quantity_base: nextBase,
            quantity_reverse: nextReverse,
          };
        }
        return c;
      })
    );

    // 2. OPTIMISTA UI FRISSÍTÉS (Nyitott Modál)
    if (selectedCard && String(selectedCard.id) === String(cardId)) {
      setSelectedCard((prev: any) => ({
        ...prev,
        quantity_base: nextBase,
        quantity_reverse: nextReverse,
        is_collected_base: nextBase > 0,
        is_collected_reverse: nextReverse > 0,
      }));
    }

    // 3. SUPABASE ADATBÁZIS MENTÉS / TÖRLÉS
    try {
      if (nextBase === 0 && nextReverse === 0) {
        const { error } = await supabase
          .from('user_collections')
          .delete()
          .eq('user_id', userId)
          .eq('card_id', cardId);

        if (error) console.error('❌ TÖRLÉSI HIBA:', error);
      } else {
        const { data: existingRecords } = await supabase
          .from('user_collections')
          .select('id')
          .eq('user_id', userId)
          .eq('card_id', cardId);

        if (existingRecords && existingRecords.length > 0) {
          const { error } = await supabase
            .from('user_collections')
            .update({
              quantity_base: nextBase,
              quantity_reverse: nextReverse,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('card_id', cardId);

          if (error) console.error('❌ MÓDOSÍTÁSI HIBA:', error);
        } else {
          const { error } = await supabase
            .from('user_collections')
            .insert({
              user_id: userId,
              card_id: cardId,
              quantity_base: nextBase,
              quantity_reverse: nextReverse,
              updated_at: new Date().toISOString(),
            });

          if (error) console.error('❌ BEILLESZTÉSI HIBA:', error);
        }
      }
    } catch (err) {
      console.error('❌ VÁRATLAN HIBA:', err);
    }
  };

  // Szűrők alkalmazása
  const displayedCards = cards.filter((card) => {
    if (selectedRarity !== 'ALL' && card.rarity !== selectedRarity) {
      return false;
    }

    const totalQty = card.quantity_base + card.quantity_reverse;
    if (selectedOwnership === 'OWNED' && totalQty === 0) {
      return false;
    }
    if (selectedOwnership === 'MISSING' && totalQty > 0) {
      return false;
    }

    return true;
  });

  const ownedInView = displayedCards.filter((c) => (c.quantity_base + c.quantity_reverse) > 0).length;
  const setTitle = setInfo?.name_de || setInfo?.title || setInfo?.name || setIdFilter || 'Összes kártya';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 bg-slate-800 px-6 py-4 rounded-2xl border border-slate-700 shadow-xl">
          <span className="animate-spin text-2xl">⏳</span>
          <span className="font-semibold text-amber-400">Kártyák betöltése...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* FEJLÉC */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <div>
            <Link
              href="/profile"
              className="text-xs text-amber-400 font-bold hover:underline mb-1 inline-block"
            >
              ➔ Vissza a profilhoz
            </Link>
            <h1 className="text-3xl font-black text-slate-100">{setTitle}</h1>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'user_only' && 'Birtokolt kártyák'}
              {mode === 'all_cards' && 'Teljes szett kártyalistája'}
              {mode === 'secrets_only' && '✨ Secret Rare kártyák gyűjteménye'}
              {isViewingOtherUser && ' (Más felhasználó kollekciója)'}
            </p>
          </div>

          <div className="text-right bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-700">
            <div className="text-2xl font-black text-amber-400">
              {mode === 'all_cards' || mode === 'secrets_only' ? (
                <span>{ownedInView} / {displayedCards.length}</span>
              ) : (
                <span>{displayedCards.length} db</span>
              )}
            </div>
            <span className="text-slate-400 text-xs block">
              {mode === 'all_cards' || mode === 'secrets_only' ? 'birtokolva / összesen' : 'birtokolt kártya'}
            </span>
          </div>
        </div>

        {/* SZŰRŐK */}
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {rarityOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400">Ritkaság:</label>
                <select
                  value={selectedRarity}
                  onChange={(e) => setSelectedRarity(e.target.value)}
                  className="bg-slate-900 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">Összes ritkaság</option>
                  {rarityOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {(mode === 'all_cards' || mode === 'secrets_only') && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400">Állapot:</label>
                <select
                  value={selectedOwnership}
                  onChange={(e) => setSelectedOwnership(e.target.value)}
                  className="bg-slate-900 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">Összes kártya</option>
                  <option value="OWNED">Csak megvan</option>
                  <option value="MISSING">Csak hiányzó</option>
                </select>
              </div>
            )}
          </div>

          {(selectedRarity !== 'ALL' || selectedOwnership !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedRarity('ALL');
                setSelectedOwnership('ALL');
              }}
              className="text-xs text-amber-400 font-bold hover:underline cursor-pointer"
            >
              Szűrők törlése
            </button>
          )}
        </div>

        {/* KÁRTYA RÁCS */}
        {displayedCards.length === 0 ? (
          <div className="bg-slate-800 p-12 rounded-2xl border border-slate-700 text-center space-y-3">
            <p className="text-4xl">🎴</p>
            <h3 className="text-lg font-bold">Nem találhatók kártyák</h3>
            <p className="text-sm text-slate-400">Nincs megjeleníthető kártya ezen a nézeten.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayedCards.map((card) => {
              const totalQty = card.quantity_base + card.quantity_reverse;
              const cardName = card.name_de || card.name || card.title || 'Névtelen kártya';
              const imageUrl = card.image_de_url || card.image_url;

              const modalData: CardModalData = {
                id: String(card.id),
                name_de: card.name_de,
                name: card.name || card.title,
                supertype: card.supertype,
                rarity: card.rarity,
                card_number: card.card_number,
                image_de_url: card.image_de_url,
                image_url: card.image_url,
                set_id: card.set_id,
                set_name: setTitle,
                quantity_base: card.quantity_base,
                quantity_reverse: card.quantity_reverse,
                is_collected_base: card.quantity_base > 0,
                is_collected_reverse: card.quantity_reverse > 0,
                types: card.types,
                hp: card.hp,
                evolveFrom: card.evolveFrom,
                stage: card.stage,
                description: card.description,
                attacks: card.attacks,
                weaknesses: card.weaknesses,
                retreat: card.retreat,
                regulationMark: card.regulationMark,
              };

              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCard(modalData)}
                  className={`cursor-pointer bg-slate-800 rounded-xl border p-3 flex flex-col justify-between hover:border-amber-500/50 transition-all ${
                    totalQty > 0
                      ? 'border-slate-700 shadow-lg'
                      : 'border-slate-800/60 opacity-40 grayscale-[40%]'
                  }`}
                >
                  <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center mb-3 relative">
                    {imageUrl ? (
                      <img src={imageUrl} alt={cardName} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="text-center p-2">
                        <span className="text-3xl block opacity-40">🃏</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-1 block">{card.id}</span>
                      </div>
                    )}

                    {card.is_secret && (
                      <span className="absolute top-2 right-2 bg-purple-900/90 text-purple-200 border border-purple-400 text-[10px] font-black px-1.5 py-0.5 rounded shadow">
                        SECRET
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-200 truncate" title={cardName}>
                      {cardName}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">{card.rarity || 'Normál'}</p>

                    <div className="pt-2 flex gap-1 text-[11px] font-semibold">
                      <span className={`px-2 py-0.5 rounded flex-1 text-center ${card.quantity_base > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-900 text-slate-600'}`}>
                        Base: {card.quantity_base}
                      </span>
                      <span className={`px-2 py-0.5 rounded flex-1 text-center ${card.quantity_reverse > 0 ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-900 text-slate-600'}`}>
                        Rev: {card.quantity_reverse}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <CardModal 
        card={selectedCard} 
        onClose={() => setSelectedCard(null)} 
        onToggleCard={handleToggleCard}
      />
    </main>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">⏳</div>}>
      <CollectionContent />
    </Suspense>
  );
}