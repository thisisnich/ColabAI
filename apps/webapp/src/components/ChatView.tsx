import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { useEffect, useRef, useState } from 'react';
import { ChatInvite } from './ChatInvite';
import { ChatSettings } from './ChatSettings';
import { ContextSettings } from './ContextSettings';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
interface ChatViewProps {
  chatId: Id<'chats'>;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  isMobile: boolean;
}

function getRoleBadgeVariant(role: string, isCreator: boolean) {
  if (isCreator) return 'default';
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'contributor':
      return 'secondary';
    case 'viewer':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getRoleDisplayName(role: string, isCreator: boolean) {
  if (isCreator) return 'Creator';
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'contributor':
      return 'Contributor';
    case 'viewer':
      return 'Viewer';
    default:
      return 'Member';
  }
}

export function ChatView({ chatId, onToggleSidebar, sidebarOpen, isMobile }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get chat details and messages
  const chatResult = useSessionQuery(api.chat.getChatDetails, { chatId });
  const messagesResult = useSessionQuery(api.chat.listMessages, { chatId });

  // Get current user's role and permissions
  const currentUserRole = useSessionQuery(api.settings.getCurrentUserRole, { chatId });

  // Get all member roles for this chat
  const memberRoles = useSessionQuery(api.settings.getChatMemberRoles, { chatId });

  // Check for forbidden access - assuming the queries return null/undefined for forbidden access
  // You may need to adjust this based on your actual API response structure
  const isForbidden = chatResult === null || messagesResult === null || currentUserRole === null;

  if (isForbidden) {
    return (
      <div className="flex flex-col h-full">
        {/* Header with basic info */}
        <div className="border-b p-3 flex justify-between items-center">
          <div className="flex items-center flex-1">
            <div>
              <h2 className="font-semibold text-lg">Chat Access Denied</h2>
            </div>
          </div>
        </div>

        {/* Access denied content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl">🚫</div>
            <h3 className="text-xl font-semibold text-muted-foreground">No Access to This Chat</h3>
            <p className="text-muted-foreground">
              You no longer have access to this chat. You may have left the chat or been removed by
              an administrator.
            </p>
            <div className="pt-4">
              <Button variant="outline" onClick={() => window.history.back()} className="mr-2">
                Go Back
              </Button>
              <Button
                // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
                onClick={() => (window.location.href = '/')}
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Extract the chat details and messages directly from the results
  const chatDetails = chatResult;
  const messages = messagesResult?.messages || [];
  const currentUserId = messagesResult?.currentUserId;

  // Send message mutation
  const sendMessage = useSessionMutation(api.chat.sendMessage);

  // Check if current user can send messages (not a viewer)
  const canSendMessages = currentUserRole?.canSendMessages ?? false;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !canSendMessages) return;

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
          {/* Chat Invite Component (hidden for viewers) */}
          <ContextSettings chatId={chatId} />
          {currentUserRole?.role === 'admin' ||
            (currentUserRole?.role === 'creator' && <ChatInvite chatId={chatId} />)}

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

              // Get sender's role information
              const senderRole = memberRoles?.find((member) => member.userId === msg.sender.id);
              const senderRoleName = senderRole?.role || 'member';
              const isCreator = senderRole?.isCreator || false;

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
                      <div
                        className={`flex items-center gap-2 mb-1 ${isSelfMessage ? 'text-blue-100' : 'text-gray-600'}`}
                      >
                        <p className="font-medium text-sm">
                          {isSelfMessage ? 'Me' : msg.sender.name}
                        </p>
                        {/* Role badge */}
                        <Badge
                          variant={getRoleBadgeVariant(senderRoleName, isCreator)}
                          className="text-xs px-2 py-0.5 h-5"
                        >
                          {getRoleDisplayName(senderRoleName, isCreator)}
                        </Badge>
                      </div>
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

      {/* Message input - Hidden for viewers */}
      {canSendMessages ? (
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
      ) : (
        <div className="border-t p-3 bg-muted/50">
          <div className="text-center text-sm text-muted-foreground py-2">
            You have view-only access to this chat
          </div>
        </div>
      )}
    </div>
  );
}
