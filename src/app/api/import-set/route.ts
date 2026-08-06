import { NextResponse } from 'next/server';
import { importSetFromTCGDex } from '../../../lib/importSet';

export async function POST(request: Request) {
  try {
    const { setId } = await request.json();

    if (!setId) {
      return NextResponse.json({ error: 'Szett ID megadása kötelező!' }, { status: 400 });
    }

    const result = await importSetFromTCGDex(setId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: `Sikeres importálás! ${result.count} kártya hozzáadva a(z) ${result.setName} szettből.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}