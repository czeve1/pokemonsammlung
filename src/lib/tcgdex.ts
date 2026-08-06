import TCGdex from '@tcgdex/sdk';

// Inicializáljuk a TCGdex-et NÉMET nyelvbeállítással ('de')
const tcgdex = new TCGdex('de');

export interface FetchCardResult {
  id: string;
  name: string;
  image?: string;
  number: string;
  rarity?: string;
}

/**
 * Német kártyák lekérése egy konkrét szettből (pl. 'sv01')
 */
export async function getGermanCardsBySet(setId: string): Promise<FetchCardResult[]> {
  try {
    const set = await tcgdex.fetch('sets', setId);
    if (!set || !set.cards) return [];

    return set.cards.map((card) => ({
      id: card.id,
      name: card.name,
      image: card.image ? `${card.image}/high.png` : undefined, // Jó minőségű kép
      number: card.localId,
      rarity: 'Common', // A részletes ritkaságot a card.rarity-ből tudod lebegtetni
    }));
  } catch (error) {
    console.error('TCGDex Hiba:', error);
    return [];
  }
}