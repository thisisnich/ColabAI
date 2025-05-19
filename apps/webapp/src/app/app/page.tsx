'use client';

import { Button } from '@/components/ui/button';
import { useAuthState } from '@/modules/auth/AuthProvider';
import { RequireLogin } from '@/modules/auth/RequireLogin';
import Link from 'next/link';

export default function AppPage() {
  const authState = useAuthState();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Welcome to the App</h1>

            <Link href="/app/profile">
              <Button variant="outline" size="sm">
                View Profile
              </Button>
            </Link>
          </div>

          {authState?.state === 'authenticated' && (
            <div className="space-y-4">
              <div className="p-4 bg-accent/40 rounded-md">
                <h2 className="text-xl font-semibold mb-2">What's Next?</h2>
                <p className="text-foreground">
                  This is your main app dashboard. From here, you can explore the application
                  features.
                </p>

                {authState.user.type === 'anonymous' && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <span className="font-semibold">Tip:</span> You're using an anonymous account.
                      Visit your{' '}
                      <Link
                        href="/app/profile"
                        className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        profile page
                      </Link>{' '}
                      to personalize your display name.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 border rounded-md">
                  <h3 className="font-medium mb-2">Your Content</h3>
                  <p className="text-sm text-muted-foreground">
                    No content yet. Start creating by using the app features.
                  </p>
                </div>

                <div className="p-4 border rounded-md">
                  <h3 className="font-medium mb-2">Recent Activity</h3>
                  <p className="text-sm text-muted-foreground">
                    Your recent activity will appear here.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
