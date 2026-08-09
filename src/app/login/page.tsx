'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Regisztráció az API-n keresztül (fontos, hogy a regisztrációs API mentse el az emailt a profiles-ba is!)
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          setErrorMsg(`Regisztrációs hiba: ${data.error || 'Ismeretlen szerver hiba'}`);
        } else {
          alert('Sikeres regisztráció! Most már bejelentkezhetsz.');
          setIsSignUp(false);
        }
      } else {
        // BEJELENTKEZÉS FELHASZNÁLÓNÉV ALAPJÁN:
        // 1. Lekérdezzük a profiles táblából a nevet tartozó e-mail címet
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', username.trim())
          .single();

        if (profileError || !profile?.email) {
          setErrorMsg('Nem található ilyen felhasználónév az adatbázisban.');
          setLoading(false);
          return;
        }

        // 2. Belépés a profiles-ból kapott valódi e-mail címmel és a megadott jelszóval
        const { data, error } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password,
        });

        if (error) {
          setErrorMsg(`Belépési hiba: ${error.message || 'Hibás jelszó'}`);
        } else if (data.session) {
          router.push('/');
          router.refresh();
        }
      }
    } catch (err: any) {
      setErrorMsg(`Hálózati hiba: ${err?.message || 'Nem sikerült elérni a szervert'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl space-y-6">
        <h1 className="text-2xl font-bold text-center text-amber-400">
          {isSignUp ? 'Regisztráció' : 'Bejelentkezés'}
        </h1>

        {errorMsg && (
          <div className="bg-red-900/50 border border-red-500/50 text-red-200 text-sm p-3 rounded-xl text-center break-words">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Felhasználónév</label>
            <input
              type="text"
              required
              placeholder="pl. pkmntrainer"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email cím</label>
              <input
                type="email"
                required
                placeholder="pelda@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Jelszó</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Feldolgozás...' : isSignUp ? 'Regisztráció' : 'Bejelentkezés'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          {isSignUp ? 'Már van fiókod?' : 'Még nincs fiókod?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
            className="text-amber-400 font-semibold underline cursor-pointer"
          >
            {isSignUp ? 'Lépj be itt' : 'Regisztrálj most'}
          </button>
        </div>
      </div>
    </main>
  );
}