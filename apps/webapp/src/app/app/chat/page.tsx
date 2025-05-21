'use client';
import { ChatLayout } from '@/components/ChatLayout';
// import { Toaster } from '@/components/ui/toaster'; // Assuming you have a toaster component from shadcn/ui
import { SessionProvider } from 'convex-helpers/react/sessions';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Create a Convex client
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

export default function App() {
  return <ChatLayout />;
}
