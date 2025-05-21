'use client';
import { api } from '@workspace/backend/convex/_generated/api';
import { useQuery } from 'convex/react';

export default function Home() {
  const appInfo = useQuery(api.appinfo.get);
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <a href="/app">cHaT</a>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <div>App Version: {appInfo?.version}</div>
      </footer>
    </div>
  );
}
