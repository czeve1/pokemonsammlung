'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ text: 'A két jelszó nem egyezik meg!', type: 'error' });
      return;
    }

    if (password.length < 6) {
      setMessage({ text: 'A jelszónak legalább 6 karakter hosszúnak kell lennie!', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setMessage({ text: 'Sikeres jelszóváltoztatás! Átirányítás...', type: 'success' });
      
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err: any) {
      setMessage({ text: err.message || 'Hiba történt a jelszó frissítése közben.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl space-y-6">
        
        <div className="text-center space-y-2">
          <span className="text-4xl">🔐</span>
          <h1 className="text-2xl font-black text-slate-100">Új jelszó megadása</h1>
          <p className="text-xs text-slate-400">Add meg az új jelszavad a fiókodhoz.</p>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-xs font-semibold text-center border ${
            message.type === 'success' 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400">Új jelszó</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-900 text-slate-200 text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400">Új jelszó mégegyszer</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-900 text-slate-200 text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Mentés...' : 'Jelszó frissítése'}
          </button>
        </form>

        <div className="text-center">
          <Link href="/login" className="text-xs text-amber-400 font-bold hover:underline">
            ➔ Vissza a bejelentkezéshez
          </Link>
        </div>

      </div>
    </main>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">⏳</div>}>
      <UpdatePasswordContent />
    </Suspense>
  );
}