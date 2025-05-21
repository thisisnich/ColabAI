import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ChatInvite } from './ChatInvite';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';

interface ChatViewProps {
  chatId: Id<'chats'>;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  isMobile: boolean;
}

// Create a new ChatSettings component
function ChatSettings({ chatId }: { chatId: Id<'chats'> }) {
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Settings className="h-4 w-4" />
      <span className="sr-only">Chat Settings</span>
    </Button>
  );
}

export function ChatView({ chatId, onToggleSidebar, sidebarOpen, isMobile }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get chat details and messages
  const chatResult = useSessionQuery(api.chat.getChatDetails, { chatId });
  const messagesResult = useSessionQuery(api.chat.listMessages, { chatId });

  // Extract the chat details and messages
  const chatDetails = chatResult;
  const messages = messagesResult?.messages || [];
  const currentUserId = messagesResult?.currentUserId;

  // Send message mutation
  const sendMessage = useSessionMutation(api.chat.sendMessage);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await sendMessage({
        chatId,
        content: message,
      });
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  });

  if (!chatDetails) {
    return (
      <div className="p-4">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="border-b p-3 flex justify-between items-center relative">
        {/* Left section - visible on desktop, hidden on mobile except for the menu button */}
        <div className={`${isMobile ? 'invisible' : 'visible'} flex items-center flex-1`}>
          <div>
            <h2 className="font-semibold text-lg">{chatDetails.name}</h2>
            <p className="text-sm text-muted-foreground">{chatDetails.memberCount} members</p>
          </div>
        </div>

        {/* Center title - only visible on mobile */}
        {isMobile && (
          <div className="absolute left-0 right-0 mx-auto w-fit text-center">
            <h2 className="font-semibold text-lg">{chatDetails.name}</h2>
            <p className="text-sm text-muted-foreground">{chatDetails.memberCount} members</p>
          </div>
        )}

        {/* Right section - always visible */}
        <div className="flex gap-2 z-10">
          {/* Chat Invite Component */}
          <ChatInvite chatId={chatId} />

          {/* Chat Settings Component */}
          <ChatSettings chatId={chatId} />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!messagesResult ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-2/3 ml-auto" />
            <Skeleton className="h-12 w-3/4" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No messages yet. Send a message to start the conversation.
            </p>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {messages.map((msg) => {
              // Determine message type
              const isSystemMessage = msg.type === 'system';
              const isSelfMessage = isSystemMessage ? false : msg.sender.id === currentUserId;

              return (
                <div key={msg.id} className="flex w-full">
                  <div
                    className={`rounded-lg p-3 inline-block min-w-[180px] max-w-[85%] ${
                      isSystemMessage
                        ? 'bg-muted text-center text-xs text-muted-foreground mx-auto'
                        : isSelfMessage
                          ? 'bg-blue-500 text-white ml-auto'
                          : 'bg-gray-200 text-gray-800 mr-auto'
                    }`}
                  >
                    {!isSystemMessage && (
                      <p
                        className={`font-medium text-sm mb-1 ${isSelfMessage ? 'text-blue-100' : 'text-gray-600'}`}
                      >
                        {isSelfMessage ? 'Me' : msg.sender.name}
                      </p>
                    )}
                    <p className="break-words">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="border-t p-3">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!message.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
