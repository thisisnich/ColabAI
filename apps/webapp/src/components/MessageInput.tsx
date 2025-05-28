import { Eye, EyeOff, FileIcon, Loader, Send } from 'lucide-react'; // Import the Send icon from Lucide
import { useEffect, useRef, useState } from 'react';
import { MessageContent } from './MessageDisplay';
import { Button } from './ui/button';

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
  className = '',
}: MessageInputProps) {
  // ========================================
  // State Management
  // ========================================
  const [message, setMessage] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // ========================================
  // Refs
  // ========================================
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ========================================
  // Event Handlers
  // ========================================
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(message);
      setMessage('');
      setIsPreviewMode(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
    // New line on Shift+Enter
    else if (e.key === 'Enter' && e.shiftKey) {
      // Let the default behavior happen (insert newline)
      return;
    }
  };

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  // ========================================
  // Effects
  // ========================================
  useEffect(() => {
    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea && !isPreviewMode) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  });

  // Focus textarea when not in preview mode
  useEffect(() => {
    if (!isPreviewMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isPreviewMode]);

  // ========================================
  // Computed Values
  // ========================================
  const hasContent = message.trim().length > 0;
  const isMultiline = message.includes('\n');
  const hasMarkdown = /(\*\*[^*]*\*\*|\*[^*]*\*|`[^`]*`|#{1,6}\s|>\s|[-*+]\s|\d+\.\s|```)/m.test(
    message
  );

  // ========================================
  // Main Render
  // ========================================
  return (
    <>
      <form
        onSubmit={handleSendMessage}
        className={`border-t border-gray-200 dark:border-gray-700 ${className}`}
      >
        {/* Main Input Row */}
        <div className="flex items-end gap-2 p-3">
          {/* File Upload - Far Left */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            title="Attach File"
          >
            <FileIcon className="h-4 w-4" />
          </Button>

          {/* Message Input/Preview Area - Center */}
          <div className="flex-1">
            {isPreviewMode ? (
              <div className="w-full min-h-[2.5rem] p-3 border rounded-md bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                <MessageContent content={message} isAI={false} enableFormatting={true} />
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                placeholder={placeholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled || isSending}
                className="w-full min-h-[2.5rem] max-h-[200px] resize-none border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                rows={1}
              />
            )}
          </div>

          {/* Action Icons - Right Side */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Preview Toggle */}
            {hasContent && hasMarkdown && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={togglePreview}
                className="h-8 w-8 p-0"
                title={isPreviewMode ? 'Exit Preview' : 'Preview'}
              >
                {isPreviewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}

            {/* Send Button */}
            <Button
              type="submit"
              disabled={!hasContent || disabled || isSending}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Send Message"
            >
              {isSending ? <Loader className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Help Text - Below the input row */}
        {hasContent && hasMarkdown && isMultiline && !isPreviewMode && (
          <div className="px-3 pb-2">
            <div className="text-xs text-muted-foreground">
              Press Shift+Enter for new line, Enter to send
            </div>
          </div>
        )}
      </form>
    </>
  );
}
