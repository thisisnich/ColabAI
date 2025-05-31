import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { Menu } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatView } from './ChatView';
import { Button } from './ui/button';

export function ChatLayout() {
  const [selectedChatId, setSelectedChatId] = useState<Id<'chats'> | ''>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Enhanced mobile detection with debouncing
  const checkMobile = useCallback(() => {
    const isMobileView = window.innerWidth < 768;
    setIsMobile(isMobileView);
    // console.log(`Mobile view: ${isMobileView}`);
    // console.log(`Sidebar open: ${sidebarOpen}`);

    // Mobile-first sidebar behavior
    if (isMobileView) {
      setSidebarOpen(false);
    } else {
      // Desktop: sidebar always visible
      setSidebarOpen(true);
    }
  }, []);

  // Handle responsive layout with proper cleanup
  useEffect(() => {
    // Debounce resize handler
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 100);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Also listen for orientation changes on mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(checkMobile, 200); // Delay for orientation change
    });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, [checkMobile]);

  // Handle chat selection - enhanced mobile behavior
  const handleChatSelect = useCallback(
    (chatId: Id<'chats'> | '') => {
      setSelectedChatId(chatId);

      // On mobile, always close sidebar when chat is selected
      if (isMobile) {
        setSidebarOpen(false);
      }
    },
    [isMobile]
  );

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="absolute inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setSidebarOpen(false);
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="Close sidebar"
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Sidebar - Enhanced mobile handling */}
      <div
        className={`${
          isMobile
            ? `fixed left-0 top-0 h-full w-80 max-w-[85vw] z-30 transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'relative h-full w-80 flex-shrink-0'
        }`}
        style={{
          // Prevent scrolling issues on mobile
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <ChatSidebar
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChatId}
          className="h-full border-r w-full bg-background"
        />
      </div>

      {/* Main content area - Enhanced mobile layout */}
      <div className="flex-1 flex flex-col relative min-h-0 w-full">
        {selectedChatId ? (
          <div className="flex-1 min-h-0">
            <ChatView
              chatId={selectedChatId}
              onToggleSidebar={handleSidebarToggle}
              sidebarOpen={sidebarOpen}
              isMobile={isMobile}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md mx-auto">
              <h2 className="text-xl sm:text-2xl font-semibold mb-3">Select a chat</h2>
              <p className="text-muted-foreground text-sm sm:text-base mb-6 leading-relaxed">
                Choose a chat from the sidebar or create a new one to get started
              </p>

              {/* Mobile-specific sidebar button */}
              {isMobile && !sidebarOpen && (
                <Button
                  onClick={() => setSidebarOpen(true)}
                  className="touch-manipulation min-h-[44px] px-6"
                  size="lg"
                >
                  <Menu className="w-4 h-4 mr-2" />
                  Open Chats
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
