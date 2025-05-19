'use client';

import { UserMenu } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthState } from '@/modules/auth/AuthProvider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();
  const authState = useAuthState();
  const isAuthenticated = authState?.state === 'authenticated';
  const isLoading = authState === undefined;

  // Get session ID from local storage
  const sessionId = typeof window !== 'undefined' ? localStorage.getItem('sessionId') : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 sm:px-6">
        <div className="mr-6 flex">
          <Link href="/" className="flex items-center whitespace-nowrap">
            <span className="font-bold text-lg">Next Convex</span>
          </Link>
        </div>
        <nav className="flex items-center justify-between w-full">
          <div className="flex gap-6 text-sm">{/* Navigation links removed */}</div>
          <div className="flex items-center gap-2">
            {!isLoading &&
              (isAuthenticated ? (
                <UserMenu />
              ) : (
                <Link href="/login">
                  <Button size="sm" variant="outline">
                    Login
                  </Button>
                </Link>
              ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
