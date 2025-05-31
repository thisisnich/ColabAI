import { useUserType } from '@/lib/useUserTypes';
import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ChatJoin } from './ChatJoin';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';

interface ChatSidebarProps {
  onChatSelect: (chatId: Id<'chats'> | '') => void;
  selectedChatId?: Id<'chats'> | '';
  className?: string;
}

export function ChatSidebar({ onChatSelect, selectedChatId, className }: ChatSidebarProps) {
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Id<'chats'> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get all chats the user is a member of
  const chats = useSessionQuery(api.chat.listChats);

  // Mutations
  const createChat = useSessionMutation(api.chat.createChat);
  const removeChat = useSessionMutation(api.chat.removeChat);

  const handleCreateChat = async () => {
    if (!newChatName.trim()) return;

    try {
      setIsCreating(true);
      console.log('Creating new chat with name:', newChatName);
      const { chatId } = await createChat({
        name: newChatName, // Only send the name
      });
      console.log('New chat created with ID:', chatId);

      setNewChatName('');
      setNewChatDialogOpen(false);
      onChatSelect(chatId);
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setIsCreating(false);
    }
  };
  const { isFullUser, isLoading } = useUserType();
  const openDeleteDialog = (chatId: Id<'chats'>, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the chat
    console.log('Opening delete dialog for chat ID:', chatId);
    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;

    try {
      setIsDeleting(true);
      console.log('Deleting chat with ID:', chatToDelete);
      await removeChat({ chatId: chatToDelete });
      console.log('Chat successfully deleted');

      // If the deleted chat was selected, clear selection
      if (selectedChatId === chatToDelete) {
        onChatSelect('');
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setChatToDelete(null);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      <div className="flex items-center justify-between p-3 border-b">
        <h2 className="font-semibold text-lg w-fit">Chats</h2>
        <div className="flex gap-1">
          <ChatJoin />
          {isFullUser && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNewChatDialogOpen(true)}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">New Chat</span>
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {chats === undefined ? (
          // Loading state
          <>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </>
        ) : chats.length === 0 ? (
          // Empty state
          <div className="text-center p-8 border rounded-lg bg-card">
            <h3 className="font-medium mb-2">No chats yet</h3>
            {isFullUser ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a new chat to start messaging or wait for someone to invite you
                </p>
                <Button variant="outline" size="sm" onClick={() => setNewChatDialogOpen(true)}>
                  Create your first chat
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                Wait for someone to invite you to a chat
              </p>
            )}
          </div>
        ) : (
          // Chat list
          chats.map((chat) => (
            <Card
              key={chat.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedChatId === chat.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onChatSelect(chat.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium truncate">{chat.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {chat.latestMessage
                          ? `${chat.members.find((m) => m?.id === chat.latestMessage?.userId)?.name || 'Unknown'}: ${chat.latestMessage.content}`
                          : `${chat.members.length} member${chat.members.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => openDeleteDialog(chat.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create new chat dialog */}
      <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Chat</DialogTitle>
            <DialogDescription>Give your chat a name. You can add members later.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Chat name"
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            className="mt-2"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewChatDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            {isFullUser && (
              <Button onClick={handleCreateChat} disabled={!newChatName.trim() || isCreating}>
                {isCreating ? 'Creating...' : 'Create Chat'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete chat confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone and all
              messages will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteChat} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
