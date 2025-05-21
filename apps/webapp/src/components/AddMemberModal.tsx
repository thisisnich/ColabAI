import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation } from 'convex-helpers/react/sessions';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';

interface AddMemberModalProps {
  chatId: Id<'chats'>;
  onMemberAdded?: () => void;
}

export function AddMemberModal({ chatId, onMemberAdded }: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Use the addMemberToChat mutation
  const addMember = useSessionMutation(api.chat.addMemberToChat);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);

    try {
      // Find user by email and get their ID
      const users = await fetch(`/api/users/find?email=${encodeURIComponent(email)}`).then((res) =>
        res.json()
      );

      if (!users || users.length === 0) {
        toast({
          title: 'User not found',
          description: 'No user was found with this email address.',
          variant: 'destructive',
        });
        return;
      }

      const userId = users[0].id as Id<'users'>;

      // Add the user to the chat
      const result = await addMember({
        chatId,
        userId,
        sessionId: 'default', // You might want to get this from your session context
      });

      toast({
        title: 'Member added',
        description: 'The user has been added to the chat.',
      });

      setEmail('');
      setIsOpen(false);

      // Call the callback if provided
      if (onMemberAdded) {
        onMemberAdded();
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      toast({
        title: 'Failed to add member',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <UserPlus className="h-4 w-4" />
          <span className="sr-only">Add Member</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Add a new member to this chat by their email address.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                placeholder="user@example.com"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !email.trim()}>
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
