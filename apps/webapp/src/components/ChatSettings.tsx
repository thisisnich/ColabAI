import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionQuery } from 'convex-helpers/react/sessions';
import { Settings } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface UserCardProps {
  user: {
    id: Id<'users'>;
    name: string;
    isCreator: boolean;
    joinedAt: number;
  };
}

function UserCard({ user }: UserCardProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-muted-foreground">
          {user.isCreator ? 'Creator' : 'Member'} • Joined{' '}
          {new Date(user.joinedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

interface ChatSettingsProps {
  chatId: Id<'chats'>;
}

export function ChatSettings({ chatId }: ChatSettingsProps) {
  const [open, setOpen] = useState(false);
  const chatDetails = useSessionQuery(api.chat.getChatDetails, { chatId });

  // Filter out null members and properly type the array
  const members = (chatDetails?.members ?? []).filter(
    (member): member is NonNullable<typeof member> => member !== null
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Chat Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Chat Members</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {members.map((member) => (
            <UserCard key={member.id} user={member} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
