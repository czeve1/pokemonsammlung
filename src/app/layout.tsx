import './globals.css';
import React from 'react';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'German TCG Collector',
  description: 'Pokémon Card Collection Tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-slate-900 text-white min-h-screen antialiased flex flex-col">
        {/* Fejléc a Profil gombbal és navigációval */}
        <Navbar />

        {/* Az adott oldal tartalma */}
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}