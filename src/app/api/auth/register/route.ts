import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json();

    if (!username || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'A felhasználónévnek legalább 3 karakterből kell állnia!' },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Kérlek adj meg egy érvényes email címet!' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'A jelszónak legalább 6 karakternek kell lennie!' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const cleanUser = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    let userId: string | undefined;

    // 1. Létrehozás az Auth-ban (Admin createUser)
    const { data, error } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { username: cleanUser }
    });

    if (error) {
      // Tartalék hagyományos signUp ha az admin kulcs nem engedné
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { username: cleanUser } }
      });

      if (signUpError) {
        return NextResponse.json(
          { error: signUpError.message },
          { status: 400 }
        );
      }
      userId = signUpData.user?.id;
    } else {
      userId = data.user?.id;
    }

    // 2. MENTÉS A PROFILES TÁBLÁBA IS!
    if (userId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: cleanUser,
          email: cleanEmail,
        });

      if (profileError) {
        console.error('Hiba a profiles táblába mentéskor:', profileError.message);
        // Nem állítjuk meg feltétlenül, de jó ha logoljuk
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Szerver hiba' },
      { status: 500 }
    );
  }
}