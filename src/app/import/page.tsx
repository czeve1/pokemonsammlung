import React from 'react';
import SetImporter from '../../components/SetImporter';

interface ImportPageProps {
  searchParams?: Promise<{
    set_id?: string;
  }>;
}

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialSetId = resolvedSearchParams.set_id || '';

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        {/* Vissza gomb a főoldalra */}
        <div>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-amber-400 transition-colors"
          >
            ← Vissza a gyűjteményhez
          </a>
        </div>

        {/* Cím és leírás */}
        <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-2">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>📥</span> Set Importáló (TCGDex)
          </h1>
          <p className="text-xs text-slate-400">
            Adja meg az importálni vagy frissíteni kívánt TCG set azonosítóját (pl. <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">sv01</code>, <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">swsh1</code>).
          </p>
        </div>

        {/* Importáló Komponens */}
        <SetImporter initialSetId={initialSetId} />
      </div>
    </main>
  );
}