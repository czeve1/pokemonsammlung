import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { SetDetails } from '../components/CardList';
import SetSelector from '../components/SetSelector';
import SetClientWrapper from '../components/SetClientWrapper';
import Link from 'next/link';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PageProps {
  searchParams?: Promise<{
    set?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentSetId = resolvedSearchParams.set;

  // 1. Összes szett lekérése
  const { data: allSets, error: setsError } = await supabase
    .from('sets')
    .select('*')
    .order('series', { ascending: true })
    .order('id', { ascending: true });

  if (setsError || !allSets || allSets.length === 0) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 p-8 flex items-center justify-center">
        <div className="bg-slate-800 p-6 rounded-2xl border border-red-500/50 max-w-lg space-y-4 text-center">
          <h1 className="text-xl font-bold text-red-400">⚠️ Nem találhatók szettek</h1>
        </div>
      </main>
    );
  }

  // 2. Aktív szett kiválasztása
  const activeSet = allSets.find(
    (s: any) => String(s.id) === String(currentSetId) || String(s.code) === String(currentSetId)
  ) || allSets[0];

  // 3. Kártyák lekérése a szethez
  const { data: cardsData } = await supabase
    .from('cards')
    .select('*')
    .eq('set_id', activeSet.id)
    .order('card_number', { ascending: true });

  const rawCards = cardsData || [];
  const cardIds = rawCards.map((c: any) => c.id);

  // 4. Felhasználói gyűjtemény adatok lekérése az adott kártyákhoz
  let userCollections: any[] = [];
  if (cardIds.length > 0) {
    const { data: collectionData } = await supabase
      .from('user_collections')
      .select('card_id, quantity_base, quantity_reverse, user_id')
      .in('card_id', cardIds);

    if (collectionData) {
      userCollections = collectionData;
    }
  }

  // 5. Kártyák összefűzése a gyűjtemény adatokkal
  const initialCards = rawCards.map((card: any) => {
    const cardCollections = userCollections.filter((uc) => uc.card_id === card.id);

    return {
      ...card,
      set_name: activeSet.name_de || activeSet.name || activeSet.code,
      is_collected_base: false,
      is_collected_reverse: false,
      user_collections_raw: cardCollections,
    };
  });

  const typedSetDetails: SetDetails = {
    id: activeSet.id,
    name_de: activeSet.name_de || activeSet.name || '',
    series: activeSet.series || '',
    code: activeSet.code || '',
    printed_code: activeSet.printed_code || '',
    release_date: activeSet.release_date || activeSet.released_at || activeSet.releaseDate || '',
    total_base_cards: activeSet.total_base_cards ?? 0,
    total_secret_cards: activeSet.total_secret_cards ?? 0,
    total_cards: activeSet.total_cards ?? 0,
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Felső sáv: SetSelector, Import gomb és gyorsgomb a részletes keresőhöz */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl">
          <SetSelector allSets={allSets} activeSetId={String(activeSet.id)} />
          
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold px-4 py-2.5 rounded-xl transition-all border border-slate-600 flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔍</span> Részletes kereső
            </Link>
            <a
              href={`/import?set_id=${activeSet.id}`}
              className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2"
            >
              <span>📥</span> Import / Hozzáadás
            </a>
          </div>
        </div>

        {/* Itt a hideFilters={true} segítségével elrejtjük a felesleges szűrőket a főoldalon */}
        <SetClientWrapper
          initialCards={initialCards}
          setDetails={typedSetDetails}
          allSets={allSets}
          initialSetId={String(activeSet.id)}
          hideFilters={true}
        />
      </div>
    </main>
  );
}