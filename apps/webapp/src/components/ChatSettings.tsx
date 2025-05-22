import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { ChevronDown, LogOut, Settings, Shield, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ChatInvite } from './ChatInvite';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface UserCardProps {
  user: {
    id: Id<'users'>;
    name: string;
    isCreator: boolean;
    role: string;
    joinedAt: number;
  };
  isCurrentUserAdmin: boolean;
  currentUserId: Id<'users'>;
  chatId: Id<'chats'>;
  onRoleChange: (userId: Id<'users'>, newRole: string) => void;
  onRemoveUser: (userId: Id<'users'>) => void;
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
    default:
      return 'Viewer';
  }
}

function UserCard({
  user,
  isCurrentUserAdmin,
  currentUserId,
  chatId,
  onRoleChange,
  onRemoveUser,
}: UserCardProps) {
  const canManageUser = isCurrentUserAdmin && !user.isCreator && user.id !== currentUserId;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium">{user.name}</p>
          <Badge variant={getRoleBadgeVariant(user.role, user.isCreator)}>
            {getRoleDisplayName(user.role, user.isCreator)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Joined {new Date(user.joinedAt).toLocaleDateString()}
        </p>
      </div>

      {canManageUser && (
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Shield className="h-4 w-4 mr-1" />
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onRoleChange(user.id, 'admin')}
                disabled={user.role === 'admin'}
              >
                Make Admin
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRoleChange(user.id, 'contributor')}
                disabled={user.role === 'contributor'}
              >
                Make Contributor
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRoleChange(user.id, 'viewer')}
                disabled={user.role === 'viewer'}
              >
                Make Viewer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-destructive hover:text-destructive"
            onClick={() => onRemoveUser(user.id)}
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface ChatSettingsProps {
  chatId: Id<'chats'>;
}

export function ChatSettings({ chatId }: ChatSettingsProps) {
  const [open, setOpen] = useState(false);
  const chatSettingsData = useSessionQuery(api.settings.getChatSettingsData, { chatId });
  const updateMemberRole = useSessionMutation(api.settings.updateMemberRole);
  const removeMemberFromChat = useSessionMutation(api.settings.removeMemberFromChat);
  const leaveChat = useSessionMutation(api.settings.leaveChat);

  const handleRoleChange = async (userId: Id<'users'>, newRole: string) => {
    try {
      await updateMemberRole({
        chatId,
        userId,
        newRole: newRole as 'admin' | 'contributor' | 'viewer' | 'member',
      });
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const handleRemoveUser = async (userId: Id<'users'>) => {
    try {
      const result = await removeMemberFromChat({
        chatId,
        userId,
      });

      if (result.chatDeleted) {
        toast.success('Chat was deleted as no members remained');
        setOpen(false);
      } else {
        toast.success('User removed from chat');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove user');
    }
  };

  const handleLeaveChat = async () => {
    try {
      const result = await leaveChat({ chatId });

      if (result.chatDeleted) {
        toast.success('You left the chat and it was deleted as no members remained');
      } else {
        toast.success('You left the chat');
      }
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to leave chat');
    }
  };

  // If data is loading or not available
  if (!chatSettingsData) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
            <Settings className="h-4 w-4" />
            <span className="sr-only">Chat Settings</span>
          </Button>
        </DialogTrigger>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Chat Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {chatSettingsData.memberCount} member{chatSettingsData.memberCount !== 1 ? 's' : ''}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Members</h3>
            {chatSettingsData.members.map((member) => (
              <UserCard
                key={member.id}
                user={member}
                isCurrentUserAdmin={chatSettingsData.isCurrentUserAdmin}
                currentUserId={chatSettingsData.currentUserId}
                chatId={chatId}
                onRoleChange={handleRoleChange}
                onRemoveUser={handleRemoveUser}
              />
            ))}
          </div>

          <div className="border-t pt-4">
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={handleLeaveChat}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave Chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
