import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { format } from 'date-fns';
import { Info, Loader2, MoreVertical, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageBox } from './MessageBox';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';

interface ChatProps {
  chatId: Id<'chats'> | null; // Modified to allow null
  className?: string;
  onClose?: () => void;
}

export function Chat({ chatId, className, onClose }: ChatProps) {
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Get chat details and messages - only query if chatId is valid
  const chatDetails = useSessionQuery(api.chat.getChatDetails, chatId ? { chatId } : 'skip');

  const messages = useSessionQuery(api.chat.listMessages, chatId ? { chatId } : 'skip');

  // Get mutations
  const renameChat = useSessionMutation(api.chat.renameChat);
  const addMember = useSessionMutation(api.chat.addMember);
  const removeMember = useSessionMutation(api.chat.removeMember);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isScrolledToBottom && messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isScrolledToBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
    setIsScrolledToBottom(isAtBottom);
  };

  const handleRenameChat = async () => {
    if (!newChatName.trim() || !chatId) return;

    try {
      setIsRenaming(true);
      await renameChat({
        chatId,
        newName: newChatName.trim(),
      });

      setRenameDialogOpen(false);
    } catch (error) {
      console.error('Failed to rename chat:', error);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim() || !chatId) return;

    try {
      setIsAddingMember(true);
      // Note: This is a simplified approach - in a real app you'd need to look up the user ID by email
      await addMember({
        chatId,
        userEmail: memberEmail.trim(), // Changed to userEmail to reflect we're passing an email
      });

      setMemberEmail('');
      setAddMemberDialogOpen(false);
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleLeaveChat = async () => {
    if (!chatId || !chatDetails) return;

    try {
      setIsLeaving(true);
      // Remove self from chat
      const result = await removeMember({
        chatId,
        // We'll need to handle this properly in the backend
        // to use the current session's user ID
      });

      setLeaveDialogOpen(false);

      // If chat was deleted or user was removed, close the chat view
      if (result?.chatDeleted || result?.success) {
        onClose?.();
      }
    } catch (error) {
      console.error('Failed to leave chat:', error);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleMessageSent = useCallback(() => {
    // When a new message is sent, make sure we're scrolled to bottom
    setIsScrolledToBottom(true);
  }, []);

  // If there's no chat selected, show a placeholder
  if (!chatId) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <Info className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No chat selected</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Select a chat from the sidebar or create a new one to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat header */}
      {chatDetails === undefined ? (
        <div className="p-3 border-b flex items-center">
          <Skeleton className="h-6 w-40" />
        </div>
      ) : (
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="font-semibold text-lg">{chatDetails.name}</h2>
            <span className="text-xs text-muted-foreground ml-2">
              {chatDetails.memberCount} member{chatDetails.memberCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 md:hidden">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setNewChatName(chatDetails.name);
                    setRenameDialogOpen(true);
                  }}
                >
                  Rename Chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAddMemberDialogOpen(true)}>
                  Add Member
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setLeaveDialogOpen(true)}
                  className="text-destructive"
                >
                  Leave Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" onScroll={handleScroll}>
        {messages === undefined ? (
          // Loading state
          <>
            <Skeleton className="h-10 w-3/4 rounded-lg" />
            <Skeleton className="h-10 w-1/2 rounded-lg ml-auto" />
            <Skeleton className="h-10 w-2/3 rounded-lg" />
          </>
        ) : messages.length === 0 ? (
          // Empty state
          <div className="text-center py-8">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          // Display messages
          messages.map((message) => {
            const isCurrentUser = message.sender.id === 'current-user-id'; // In a real app, compare with the current user's ID
            const messageTime = format(new Date(message.timestamp), 'h:mm a');

            return (
              <div
                key={message.id}
                className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-lg ${
                    isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  {message.content}
                </div>
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
                  <span>{isCurrentUser ? 'You' : message.sender.name}</span>
                  <span className="mx-1">•</span>
                  <span>{messageTime}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Message input */}
      <MessageBox chatId={chatId} onMessageSent={handleMessageSent} />

      {/* Rename Chat Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Give this chat a new name that describes its purpose.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="New chat name"
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            className="mt-2"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameChat} disabled={!newChatName.trim() || isRenaming}>
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Enter the email of the person you want to add to this chat.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Email address"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            className="mt-2"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddMemberDialogOpen(false)}
              disabled={isAddingMember}
            >
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={!memberEmail.trim() || isAddingMember}>
              {isAddingMember ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Chat Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this chat? You won't be able to see any new messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLeaveDialogOpen(false)}
              disabled={isLeaving}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLeaveChat} disabled={isLeaving}>
              {isLeaving ? 'Leaving...' : 'Leave Chat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
