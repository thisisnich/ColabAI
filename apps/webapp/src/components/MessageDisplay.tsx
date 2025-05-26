import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type React from 'react';
import { Badge } from './ui/badge';

interface Message {
  id: Id<'messages'>;
  chatId: Id<'chats'>;
  content: string;
  timestamp: number;
  type: string; // Changed from union type to string
  sender: {
    id: Id<'users'>;
    name: string;
  };
}

interface MemberRole {
  userId: Id<'users'>; // Changed from string to Id<'users'>
  role: string;
  isCreator: boolean;
}

interface FormattedMessageDisplayProps {
  messages: Message[];
  currentUserId: string;
  memberRoles?: MemberRole[] | null; // Added null to the union type
  messagesEndRef: React.RefObject<HTMLDivElement | null>; // Added null to the union type
}

// Helper function to get role badge variant
const getRoleBadgeVariant = (role: string, isCreator: boolean) => {
  if (isCreator) return 'default';
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'moderator':
    case 'contributor': // Added contributor case
      return 'secondary';
    case 'viewer':
      return 'outline';
    default:
      return 'outline';
  }
};

// Helper function to get role display name
const getRoleDisplayName = (role: string, isCreator: boolean) => {
  if (isCreator) return 'Creator';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

// Component to render formatted message content
const MessageContent = ({ content, isAI = false }: { content: string; isAI?: boolean }) => {
  if (!isAI) {
    return <p className="break-words whitespace-pre-wrap">{content}</p>;
  }

  // Split content by lines to handle different formatting elements
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentElement: string[] = [];
  let inCodeBlock = false;
  let codeBlockLanguage = '';

  const flushCurrentElement = () => {
    if (currentElement.length > 0) {
      const text = currentElement.join('\n');
      if (text.trim()) {
        elements.push(
          <div key={elements.length} className="mb-2 last:mb-0">
            {formatInlineText(text)}
          </div>
        );
      }
      currentElement = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      flushCurrentElement();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLanguage = line.substring(3).trim();
      } else {
        inCodeBlock = false;
        codeBlockLanguage = '';
      }
      continue;
    }

    if (inCodeBlock) {
      if (currentElement.length === 0) {
        // Start new code block
        currentElement = [line];
      } else {
        currentElement.push(line);
      }

      // Check if this is the last line or if next line ends code block
      if (i === lines.length - 1 || lines[i + 1]?.startsWith('```')) {
        elements.push(
          <div key={elements.length} className="mb-3">
            <pre className="bg-gray-100 rounded-md p-3 text-sm overflow-x-auto">
              <code className={codeBlockLanguage ? `language-${codeBlockLanguage}` : ''}>
                {currentElement.join('\n')}
              </code>
            </pre>
          </div>
        );
        currentElement = [];
      }
      continue;
    }

    // Handle headers
    if (line.startsWith('### ')) {
      flushCurrentElement();
      elements.push(
        <h3 key={elements.length} className="text-lg font-semibold mb-2 mt-3 first:mt-0">
          {formatInlineText(line.substring(4))}
        </h3>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushCurrentElement();
      elements.push(
        <h2 key={elements.length} className="text-xl font-bold mb-2 mt-4 first:mt-0">
          {formatInlineText(line.substring(3))}
        </h2>
      );
      continue;
    }

    if (line.startsWith('# ')) {
      flushCurrentElement();
      elements.push(
        <h1 key={elements.length} className="text-2xl font-bold mb-3 mt-4 first:mt-0">
          {formatInlineText(line.substring(2))}
        </h1>
      );
      continue;
    }

    // Handle horizontal rules
    if (line.trim() === '---' || line.trim() === '***') {
      flushCurrentElement();
      elements.push(<hr key={elements.length} className="my-4 border-gray-300" />);
      continue;
    }

    // Handle lists
    if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/)) {
      flushCurrentElement();

      // Collect all consecutive list items
      const listItems = [line];
      let j = i + 1;
      while (
        j < lines.length &&
        (lines[j].match(/^\s*[-*+]\s/) || lines[j].match(/^\s*\d+\.\s/) || lines[j].trim() === '')
      ) {
        if (lines[j].trim() !== '') {
          listItems.push(lines[j]);
        }
        j++;
      }
      i = j - 1; // Skip processed lines

      const isOrdered = line.match(/^\s*\d+\.\s/);
      const ListTag = isOrdered ? 'ol' : 'ul';

      elements.push(
        <ListTag
          key={elements.length}
          className={`mb-3 ${isOrdered ? 'list-decimal' : 'list-disc'} list-inside space-y-1`}
        >
          {listItems.map((item) => {
            const cleanItem = item.replace(/^\s*[-*+]\s/, '').replace(/^\s*\d+\.\s/, '');
            return (
              <li key={`${elements.length}-${cleanItem.substring(0, 20)}`} className="break-words">
                {formatInlineText(cleanItem)}
              </li>
            );
          })}
        </ListTag>
      );
      continue;
    }

    // Handle blockquotes
    if (line.startsWith('> ')) {
      flushCurrentElement();
      elements.push(
        <blockquote
          key={elements.length}
          className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-3"
        >
          {formatInlineText(line.substring(2))}
        </blockquote>
      );
      continue;
    }

    // Regular text
    currentElement.push(line);
  }

  flushCurrentElement();

  return <div className="space-y-0">{elements}</div>;
};

// Helper function to format inline text (bold, italic, code, links, etc.)
const formatInlineText = (text: string): React.ReactNode => {
  if (!text) return null;

  // Split by various inline formatting patterns
  const parts = text.split(/(\*\*[^*]*\*\*|\*[^*]*\*|`[^`]*`|\[[^\]]*\]\([^)]*\))/);

  return parts.map((part) => {
    const partKey = `${part.substring(0, 10)}-${part.length}`;

    // Bold text
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={partKey} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic text
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**')) {
      return (
        <em key={partKey} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Inline code
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={partKey} className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Links
    const linkMatch = part.match(/\[([^\]]*)\]\(([^)]*)\)/);
    if (linkMatch) {
      return (
        <a
          key={partKey}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 underline"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
};

export function FormattedMessageDisplay({
  messages,
  currentUserId,
  memberRoles,
  messagesEndRef,
}: FormattedMessageDisplayProps) {
  return (
    <div className="flex flex-col space-y-4">
      {messages.map((msg) => {
        // Determine message type - handle string types
        const isSystemMessage = msg.type === 'system';
        const isSelfMessage = isSystemMessage ? false : msg.sender.id === currentUserId;
        const isAIMessage = msg.type === 'chatbot' || msg.type === 'ai' || msg.type === 'assistant';

        // Get sender's role information
        const senderRole = memberRoles?.find((member) => member.userId === msg.sender.id);
        const senderRoleName = senderRole?.role || 'member';
        const isCreator = senderRole?.isCreator || false;

        return (
          <div key={msg.id} className="flex w-full">
            <div
              className={`rounded-lg p-4 inline-block min-w-[180px] max-w-[70%] ${
                isSystemMessage
                  ? 'bg-muted text-center text-xs text-muted-foreground mx-auto'
                  : isSelfMessage
                    ? 'bg-blue-500 text-white ml-auto'
                    : isAIMessage
                      ? 'bg-gray-50 border border-gray-200 text-gray-800 mr-auto'
                      : 'bg-gray-200 text-gray-800 mr-auto'
              }`}
            >
              {!isSystemMessage && (
                <div
                  className={`flex items-center gap-2 mb-2 pb-2 border-b ${
                    isSelfMessage
                      ? 'text-blue-100 border-blue-400'
                      : isAIMessage
                        ? 'text-gray-600 border-gray-200'
                        : 'text-gray-600 border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm">{isSelfMessage ? 'Me' : msg.sender.name}</p>
                  {/* Role badge */}
                  {!isAIMessage && (
                    <Badge
                      variant={getRoleBadgeVariant(senderRoleName, isCreator)}
                      className="text-xs px-2 py-0.5 h-5"
                    >
                      {getRoleDisplayName(senderRoleName, isCreator)}
                    </Badge>
                  )}
                </div>
              )}
              <div className={isAIMessage ? 'prose prose-sm max-w-200' : ''}>
                <MessageContent content={msg.content} isAI={isAIMessage} />
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
