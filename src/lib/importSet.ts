import TCGdex from '@tcgdex/sdk';
import { supabase } from './supabase';

const tcgdex = new TCGdex('de');

// Intelligens ritkaság-meghatározó funkció
function determineRarityAndReverse(
  rawRarity: string | undefined,
  cardName: string,
  localIdStr: string,
  totalBaseCards: number
) {
  const name = (cardName || '').toLowerCase();
  const localId = parseInt(localIdStr.replace(/\D/g, ''), 10) || 0;
  
  let rarity = rawRarity || '';
  let hasReverseHolo = true;

  // 1. Ha a név alapján ex / Ultra Rare kártyáról van szó
  const isEX = name.includes(' ex') || name.endsWith('ex') || name.includes('vmax') || name.includes('vstar');
  
  // 2. Ha a sorszáma nagyobb a szett alap méreténél -> Secret / Illustration Rare
  const isSecret = totalBaseCards > 0 && localId > totalBaseCards;

  if (isEX || isSecret) {
    hasReverseHolo = false; // Ezeknek NICS Reverse Holo változatuk!
    
    if (!rarity || rarity === 'Common') {
      rarity = isEX ? 'Double Rare (ex)' : 'Illustration / Secret Rare';
    }
  } else if (!rarity || rarity === 'Common') {
    // Alapértelmezett finomítás, ha a TCGDex nem adott ritkaságot
    if (name.includes('trainer') || name.includes('energie')) {
      rarity = 'Uncommon';
    } else {
      rarity = 'Common';
    }
  }

  // Reverse Holo tiltás egyéb ultra ritka megnevezéseknél
  const lowerRarity = rarity.toLowerCase();
  if (
    lowerRarity.includes('ultra') ||
    lowerRarity.includes('secret') ||
    lowerRarity.includes('illustration') ||
    lowerRarity.includes('special') ||
    lowerRarity.includes('hyper')
  ) {
    hasReverseHolo = false;
  }

  return { rarity, hasReverseHolo };
}

export async function importSetFromTCGDex(setId: string) {
  try {
    const cleanSetId = setId.trim().toLowerCase();
    console.log(`Szett lekérése a TCGDex-ről: ${cleanSetId}...`);

    // 1. Szett adatok lekérése
    const set = await tcgdex.fetch('sets', cleanSetId);
    if (!set) {
      return { success: false, error: 'A szett nem található a TCGDex-en!' };
    }

    const totalCount = set.cardCount?.official || set.cardCount?.total || 0;

    // 2. Szett mentése / frissítése
    const { error: setError } = await supabase.from('sets').upsert(
      {
        id: set.id,
        name_de: set.name,
        name_en: set.name,
        total_cards: set.cardCount?.total || 0,
        total_base_cards: totalCount,
        series: set.serie?.name || 'Karmesin & Purpur',
        release_date: set.releaseDate || null,
      },
      { onConflict: 'id' }
    );

    if (setError) {
      return { success: false, error: `Szett mentési hiba: ${setError.message}` };
    }

    // 3. Kártyák feldolgozása
    if (set.cards && set.cards.length > 0) {
      const cardsToInsert = [];

      for (const cardSummary of set.cards) {
        let fetchedRarity = undefined;

        try {
          const detail = await tcgdex.fetch('cards', cardSummary.id);
          if (detail && detail.rarity) {
            fetchedRarity = detail.rarity;
          }
        } catch {
          // Ha a részletes lekérés sikertelen, az algoritmus automatikusan kiszámolja
        }

        const { rarity, hasReverseHolo } = determineRarityAndReverse(
          fetchedRarity,
          cardSummary.name,
          cardSummary.localId,
          totalCount
        );

        cardsToInsert.push({
          id: cardSummary.id,
          set_id: set.id,
          card_number: cardSummary.localId,
          name_de: cardSummary.name,
          supertype: 'Pokémon',
          rarity: rarity,
          has_reverse_holo: hasReverseHolo,
          image_url: cardSummary.image ? `${cardSummary.image}/high.png` : null,
        });
      }

      // 4. Frissítés a Supabase-ben
      const { error: cardsError } = await supabase
        .from('cards')
        .upsert(cardsToInsert, { onConflict: 'id' });

      if (cardsError) {
        return { success: false, error: `Kártyák mentési hiba: ${cardsError.message}` };
      }
    }

    return { success: true, count: set.cards?.length || 0, setName: set.name };
  } catch (error: any) {
    return { success: false, error: error.message || 'Váratlan hiba történt' };
  }
}