import React from 'react';
import { createClient } from '@supabase/supabase-js';
import SetClientWrapper from '../../components/SetClientWrapper';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SearchPageProps {
  searchParams?: Promise<{
    set?: string;
    setId?: string;
    query?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedSetId = resolvedSearchParams.set || resolvedSearchParams.setId || 'ALL';
  const initialQuery = resolvedSearchParams.query || '';

  // 1. Összes szett lekérése sorozattal (id, name_de, series)
  const { data: allSets } = await supabase
    .from('sets')
    .select('id, name_de, series')
    .order('id', { ascending: true });

  const setsList = allSets || [];

  // 2. Összes kártya lekérése LAPOZÁSSAL (hogy a secret kártyák se maradjanak le a 1000-es limit miatt)
  let cardsData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let fetchMore = true;

  while (fetchMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('cards')
      .select('*, sets(id, name_de, series)')
      .order('card_number', { ascending: true })
      .range(from, to);

    if (error || !data || data.length === 0) {
      fetchMore = false;
    } else {
      cardsData = [...cardsData, ...data];
      if (data.length < pageSize) {
        fetchMore = false;
      } else {
        page++;
      }
    }
  }

  const rawCards = cardsData;
  const cardIds = rawCards.map((c: any) => c.id);

  // 3. Felhasználói gyűjtemény lekérése (szintén kötegelve, ha több mint 1000 kártya lenne)
  let userCollections: any[] = [];
  if (cardIds.length > 0) {
    for (let i = 0; i < cardIds.length; i += 500) {
      const batchIds = cardIds.slice(i, i + 500);
      const { data: collectionData } = await supabase
        .from('user_collections')
        .select('card_id, quantity_base, quantity_reverse, user_id')
        .in('card_id', batchIds);

      if (collectionData) {
        userCollections = [...userCollections, ...collectionData];
      }
    }
  }

  // 4. Kártyák összefűzése
  const initialCards = rawCards.map((card: any) => {
    const cardCollections = userCollections.filter((uc) => uc.card_id === card.id);
    const parentSet = card.sets;

    return {
      ...card,
      name_de: card.name_de,
      set_id: card.set_id || parentSet?.id,
      set_name: parentSet?.name_de || 'Ismeretlen szett',
      series: parentSet?.series || 'Egyéb sorozatok',
      is_collected_base: false,
      is_collected_reverse: false,
      user_collections_raw: cardCollections,
    };
  });

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <SetClientWrapper
          initialCards={initialCards}
          allSets={setsList}
          initialSetId={selectedSetId}
          initialQuery={initialQuery}
        />
      </div>
    </main>
  );
}