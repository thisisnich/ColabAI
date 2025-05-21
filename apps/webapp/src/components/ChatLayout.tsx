import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useState } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatView } from './ChatView'; // You'll need to create this component

export function ChatLayout() {
  const [selectedChatId, setSelectedChatId] = useState<Id<'chats'> | ''>('');

  return (
    <div className="flex h-screen bg-background">
      {/* Chat Sidebar - This displays the list of chats */}
      <ChatSidebar
        onChatSelect={setSelectedChatId}
        selectedChatId={selectedChatId}
        className="w-80 border-r shrink-0"
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {selectedChatId ? (
          <ChatView chatId={selectedChatId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Select a chat</h2>
              <p className="text-muted-foreground">
                Choose a chat from the sidebar or create a new one to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
