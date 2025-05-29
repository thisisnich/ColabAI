import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatView } from './testChatView';
import { Button } from './ui/button';

export function ChatLayout() {
  const [selectedChatId, setSelectedChatId] = useState<Id<'chats'> | ''>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive layout
  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);

      // Only control sidebar visibility on mobile
      if (isMobileView) {
        setSidebarOpen(false);
      } else {
        // On desktop/large screens, sidebar is always visible
        setSidebarOpen(true);
      }
    };

    // Check on mount
    checkMobile();

    // Check on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle chat selection - auto-close sidebar on mobile when a chat is selected
  const handleChatSelect = (chatId: Id<'chats'> | '') => {
    setSelectedChatId(chatId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Sidebar - only collapsible on mobile */}
      <div
        className={`${
          isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'
        } transition-transform duration-300 ${
          isMobile ? 'absolute' : 'relative'
        } h-full w-80 flex-shrink-0 z-30`}
      >
        <ChatSidebar
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChatId}
          className="h-full border-r w-full"
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col relative min-h-0">
        {/* Toggle button for sidebar - only on mobile */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`absolute top-3 z-40 ${sidebarOpen ? 'right-3' : 'left-3'}`}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {selectedChatId ? (
          <div className="flex-1 min-h-0">
            <ChatView
              chatId={selectedChatId}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              sidebarOpen={sidebarOpen}
              isMobile={isMobile}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Select a chat</h2>
              <p className="text-muted-foreground">
                Choose a chat from the sidebar or create a new one to get started
              </p>
              {isMobile && !sidebarOpen && (
                <Button onClick={() => setSidebarOpen(true)} className="mt-4">
                  Open Sidebar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
