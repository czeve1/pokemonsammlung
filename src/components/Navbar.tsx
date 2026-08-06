'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Profil felhasználónév lekérése
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        setUsername(data?.username || user.email?.split('@')[0] || 'Profil');
      } else {
        setUsername(null);
      }
    }

    getUser();

    // Figyeljük az auth állapot változását (pl. belépés/kilépés)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUser();
      } else {
        setUsername(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsername(null);
    router.push('/login');
    router.refresh();
  };

  // Ne mutassuk a Navbart a bejelentkező oldalon
  if (pathname === '/login') return null;

  return (
    <header className="bg-slate-800 border-b border-slate-700 text-slate-100 sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* LOGÓ / FŐOLDAL LINK */}
        <Link href="/" className="flex items-center gap-2 font-black text-amber-400 text-xl tracking-wide hover:opacity-90">
          <span>🎴</span> CollectorApp
        </Link>

        {/* MENÜ ELEMEK */}
        <div className="flex items-center gap-3">
          {username ? (
            <>
              {/* PROFIL GOMB */}
              <Link
                href={`/profile/${username}`}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border ${
                  pathname === '/profile'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-slate-900/60 hover:bg-slate-700 border-slate-700 text-amber-400'
                }`}
              >
                <span>👤</span>
                <span className="max-w-[120px] truncate">{username}</span>
              </Link>

              {/* KIJELENTKEZÉS GOMB */}
              <button
                onClick={handleLogout}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-semibold px-3 py-2 rounded-xl transition-all"
                title="Kijelentkezés"
              >
                🚪
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold px-4 py-2 rounded-xl transition-all"
            >
              Bejelentkezés
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}