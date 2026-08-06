'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

interface ProfileData {
  id: string;
  username: string;
  created_at: string;
}

interface SetStat {
  setId: string;
  setName: string;
  totalOwned: number;
  secretOwned: number;
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileUsername = decodeURIComponent(String(params?.username || ''));

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [currentLoggedInUserId, setCurrentLoggedInUserId] = useState<string | null>(null);

  const [setStats, setSetStats] = useState<SetStat[]>([]);
  const [totalCardsCount, setTotalCardsCount] = useState(0);
  const [totalSecretCount, setTotalSecretCount] = useState(0);

  const [openTab, setOpenTab] = useState<'sets' | 'cards' | 'secrets' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfileData() {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1. Megnézzük, hogy van-e bejelentkezett user (vendégként is folytatható hiba nélkül)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          setCurrentLoggedInUserId(sessionData.session.user.id);
        }

        // 2. Lekérdjük a profil tulajdonosát a megadott username alapján
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, created_at')
          .ilike('username', profileUsername)
          .single();

        if (profileError || !profileData) {
          setErrorMsg('A keresett felhasználó nem található.');
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // 3. Lekérdjük az adott felhasználó kollekcióját
        const { data: colData } = await supabase
          .from('user_collections')
          .select('card_id, quantity_base, quantity_reverse')
          .eq('user_id', profileData.id);

        const userItems = colData || [];
        const ownedItems = userItems.filter(
          (i) => ((i.quantity_base || 0) + (i.quantity_reverse || 0)) > 0
        );

        if (ownedItems.length === 0) {
          setLoading(false);
          return;
        }

        // 4. Szettek lekérése
        const { data: setsData } = await supabase
          .from('sets')
          .select('*');

        const setsMap = new Map<string, { name: string; totalBase: number }>();
        if (setsData) {
          setsData.forEach((s: any) => {
            const totalBase = Number(s.total_base_cards ?? s.total_base ?? 0);
            setsMap.set(String(s.id), {
              name: s.name_de || s.name || s.title || String(s.id),
              totalBase: totalBase,
            });
          });
        }

        // 5. Kártyák lekérése kötegelve
        const cardIds = Array.from(new Set(ownedItems.map((item) => item.card_id).filter(Boolean)));
        const cardsMap = new Map<string, { id: string; set_id: string | null; card_number: number }>();

        const CHUNK_SIZE = 50;
        for (let i = 0; i < cardIds.length; i += CHUNK_SIZE) {
          const chunk = cardIds.slice(i, i + CHUNK_SIZE);
          const { data: chunkCards } = await supabase
            .from('cards')
            .select('*')
            .in('id', chunk);

          if (chunkCards) {
            chunkCards.forEach((c: any) => {
              const rawNumStr = String(c.card_number || c.number || c.id);
              const cleanNumMatch = rawNumStr.match(/\d+/);
              const num = cleanNumMatch ? parseInt(cleanNumMatch[0], 10) : 0;

              cardsMap.set(String(c.id), {
                id: String(c.id),
                set_id: c.set_id ? String(c.set_id) : null,
                card_number: num,
              });
            });
          }
        }

        // 6. Statisztikák összegzése
        let totalSum = 0;
        let secretSum = 0;
        const statsMap: Record<string, SetStat> = {};

        ownedItems.forEach((item) => {
          const qty = (item.quantity_base || 0) + (item.quantity_reverse || 0);
          const card = cardsMap.get(String(item.card_id));
          if (!card) return;

          const setId = card.set_id || 'unknown';
          const setObj = setsMap.get(setId);
          const setName = setObj ? setObj.name : 'Ismeretlen szett';
          const totalBase = setObj ? setObj.totalBase : 0;

          const isSecret = totalBase > 0 && card.card_number > totalBase;

          totalSum += qty;
          if (isSecret) secretSum += qty;

          if (!statsMap[setId]) {
            statsMap[setId] = { setId, setName, totalOwned: 0, secretOwned: 0 };
          }

          statsMap[setId].totalOwned += qty;
          if (isSecret) statsMap[setId].secretOwned += qty;
        });

        setTotalCardsCount(totalSum);
        setTotalSecretCount(secretSum);
        setSetStats(Object.values(statsMap));
      } catch (err) {
        console.error('Hiba történt a profil betöltésekor:', err);
        setErrorMsg('Váratlan hiba történt a betöltés során.');
      } finally {
        setLoading(false);
      }
    }

    if (profileUsername) {
      loadProfileData();
    }
  }, [profileUsername]);

  const toggleTab = (tab: 'sets' | 'cards' | 'secrets') => {
    setOpenTab((prev) => (prev === tab ? null : tab));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 bg-slate-800 px-6 py-4 rounded-2xl border border-slate-700 shadow-xl">
          <span className="animate-spin text-2xl">⏳</span>
          <span className="font-semibold text-amber-400">Profil betöltése...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 space-y-4">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center space-y-3 max-w-md w-full">
          <span className="text-4xl block">❌</span>
          <h1 className="text-xl font-bold text-red-400">{errorMsg || 'Nem található profil'}</h1>
          <p className="text-xs text-slate-400">Ellenőrizd a felhasználónevet, vagy térj vissza a főoldalra.</p>
          <Link
            href="/"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg"
          >
            Vissza a főoldalra
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentLoggedInUserId ? currentLoggedInUserId === profile.id : false;
  const secretSets = setStats.filter((s) => s.secretOwned > 0);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* FEJLÉC */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-amber-400">{profile.username}</h1>
              {isOwnProfile && (
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/40">
                  Te profilod
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Regisztráció: {new Date(profile.created_at).toLocaleDateString('hu-HU')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Link
              href={isOwnProfile ? '/collection?mode=user_only' : `/collection?user=${profile.id}&mode=user_only`}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-3 rounded-xl transition-all shadow-lg text-center flex items-center justify-center gap-2"
            >
              <span>🎴</span> {isOwnProfile ? 'Teljes Kollekció' : `${profile.username} Kollekciója`}
            </Link>
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Profil link a vágólapra másolva! Oszd meg bárkivel.');
              }}
              className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium px-4 py-3 rounded-xl transition-all text-center text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🔗</span> Megosztás
            </button>

            {isOwnProfile && (
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="w-full sm:w-auto bg-slate-700 hover:bg-red-600/80 text-slate-200 hover:text-white font-medium px-4 py-3 rounded-xl transition-all text-center text-sm cursor-pointer"
              >
                Kijelentkezés
              </button>
            )}

            {!currentLoggedInUserId && (
              <Link
                href="/login"
                className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-amber-400 font-medium px-4 py-3 rounded-xl transition-all text-center text-sm flex items-center justify-center gap-2"
              >
                Bejelentkezés
              </Link>
            )}
          </div>
        </div>

        {/* ACCORDION FÜLEK */}
        <div className="space-y-4">

          {/* 1. SZETTEK FULL */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
            <button
              onClick={() => toggleTab('sets')}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-750 cursor-pointer"
            >
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Szettek</span>
                <h2 className="text-xl font-bold">{setStats.length} szett a gyűjteményben</h2>
              </div>
              <span className="text-2xl text-slate-400">{openTab === 'sets' ? '▲' : '▼'}</span>
            </button>

            {openTab === 'sets' && (
              <div className="p-5 pt-0 border-t border-slate-700/50 space-y-2 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {setStats.map((set) => (
                    <Link
                      key={set.setId}
                      href={`/collection?set=${set.setId}&user=${profile.id}&mode=all_cards`}
                      className="bg-slate-900/60 hover:bg-amber-500/10 hover:border-amber-500/50 border border-slate-700 p-3 rounded-xl transition-all flex justify-between items-center text-sm font-semibold"
                    >
                      <span className="truncate">{set.setName}</span>
                      <span className="text-xs text-amber-400 font-bold shrink-0 ml-2">Teljes szett ➔</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. KÁRTYÁK SZETTENKÉNT */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
            <button
              onClick={() => toggleTab('cards')}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-750 cursor-pointer"
            >
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Kártyák szettenként</span>
                <h2 className="text-xl font-bold">{totalCardsCount} kártya összesen</h2>
              </div>
              <span className="text-2xl text-slate-400">{openTab === 'cards' ? '▲' : '▼'}</span>
            </button>

            {openTab === 'cards' && (
              <div className="p-5 pt-0 border-t border-slate-700/50 space-y-2 mt-3">
                <div className="space-y-2">
                  {setStats.map((set) => (
                    <Link
                      key={set.setId}
                      href={`/collection?set=${set.setId}&user=${profile.id}&mode=user_only`}
                      className="bg-slate-900/60 hover:bg-slate-700 border border-slate-700/70 p-3.5 rounded-xl flex items-center justify-between transition-all"
                    >
                      <span className="font-semibold text-slate-200 truncate pr-2">{set.setName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-full font-bold">
                          {set.totalOwned} db megvan
                        </span>
                        <span className="text-slate-500 text-xs">➔</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. RITKASÁGOK (SECRET) */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
            <button
              onClick={() => toggleTab('secrets')}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-750 cursor-pointer"
            >
              <div>
                <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">Ritkaságok</span>
                <h2 className="text-xl font-bold text-purple-200">✨ {totalSecretCount} Secret Rare kártya</h2>
              </div>
              <span className="text-2xl text-slate-400">{openTab === 'secrets' ? '▲' : '▼'}</span>
            </button>

            {openTab === 'secrets' && (
              <div className="p-5 pt-0 border-t border-slate-700/50 space-y-2 mt-3">
                {secretSets.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2 italic text-center">
                    Nem található Secret Rare kártya ebben a gyűjteményben.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {secretSets.map((set) => (
                      <Link
                        key={set.setId}
                        href={`/collection?set=${set.setId}&user=${profile.id}&mode=secrets_only`}
                        className="bg-slate-900/60 hover:bg-purple-900/20 border border-purple-500/30 p-3.5 rounded-xl flex items-center justify-between transition-all"
                      >
                        <span className="font-semibold text-purple-100 truncate pr-2">{set.setName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-1 rounded-full font-bold border border-purple-500/40">
                            ✨ {set.secretOwned} Secret Rare
                          </span>
                          <span className="text-slate-500 text-xs">➔</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
}