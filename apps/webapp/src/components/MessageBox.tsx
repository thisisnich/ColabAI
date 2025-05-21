import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation } from 'convex-helpers/react/sessions';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface MessageBoxProps {
  chatId: Id<'chats'>;
  className?: string;
  onMessageSent?: () => void;
}

export function MessageBox({ chatId, className, onMessageSent }: MessageBoxProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Get the sendMessage mutation
  const sendMessage = useSessionMutation(api.chat.sendMessage);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !chatId) return;

    try {
      setIsSending(true);
      await sendMessage({
        chatId,
        content: trimmedMessage,
      });
      // Clear the input after sending
      setMessage('');
      // Notify parent component that message was sent
      onMessageSent?.();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form
      onSubmit={handleSendMessage}
      className={`flex items-center gap-2 p-2 border-t ${className}`}
    >
      <Input
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={isSending || !chatId}
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={!message.trim() || isSending || !chatId}>
        <Send className="h-4 w-4" />
        <span className="sr-only">Send</span>
      </Button>
    </form>
  );
}
