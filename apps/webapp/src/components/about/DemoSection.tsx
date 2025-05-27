import { Settings, Share2, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
// Chat Message Component
// Define the message type

interface Message {
  user: string;
  role: 'Creator' | 'Member' | string; // You can make this more specific if needed
  timestamp: string;
  message: string;
}

// Define the component props type
interface ChatMessageProps {
  message: Message;
  isVisible: boolean;
}

// Chat Message Component
const ChatMessage: React.FC<ChatMessageProps> = ({ message, isVisible }) => {
  if (!isVisible) return null;

  const isAI = message.user === 'DeepSeek AI';

  return (
    <div
      className={`flex ${isAI ? 'justify-start' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-500`}
    >
      <div className="max-w-[80%]">
        <div className="flex items-center space-x-2 mb-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              isAI
                ? 'bg-purple-100 text-purple-800'
                : message.role === 'Creator'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
            }`}
          >
            {message.user.charAt(0)}
          </div>
          <span className="text-sm font-medium text-foreground">{message.user}</span>
          <span className="text-xs text-muted-foreground">{message.role}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{message.timestamp}</span>
        </div>
        <div
          className={`px-4 py-3 rounded-lg ${
            isAI ? 'bg-purple-50 border border-purple-200' : 'bg-muted'
          }`}
        >
          <p className="text-sm text-foreground leading-relaxed">{message.message}</p>
        </div>
      </div>
    </div>
  );
};

// Demo Section Component
const DemoSection = () => {
  const [currentMessage, setCurrentMessage] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const chatMessages = [
    {
      user: 'Sarah',
      role: 'Creator',
      message:
        '/deepseek what do you think about targeting Gen Z specifically for our new product launch campaign?',
      timestamp: '2 min ago',
    },
    {
      user: 'DeepSeek AI',
      role: 'Member',
      message:
        "Great question! For Gen Z marketing, consider these strategies: 1) Authentic storytelling over polished ads, 2) Short-form video content on TikTok/Instagram Reels, 3) Interactive experiences like AR filters, 4) Collaborations with micro-influencers they trust, 5) Social causes alignment. What's your product category?",
      timestamp: '1 min ago',
    },
    {
      user: 'Mike',
      role: 'Contributor',
      message:
        'Building on that - we should definitely focus on sustainability messaging. Our target demos really care about environmental impact.',
      timestamp: '30 sec ago',
    },
    {
      user: 'Sarah',
      role: 'Creator',
      message:
        "Good point Mike! We're launching eco-friendly water bottles. I'm thinking we could partner with environmental nonprofits too.",
      timestamp: '25 sec ago',
    },
    {
      user: 'Alex',
      role: 'Contributor',
      message:
        "Love the nonprofit angle! What about creating a challenge where users show how they're reducing plastic waste? Could go viral if done right.",
      timestamp: '20 sec ago',
    },
    {
      user: 'Mike',
      role: 'Contributor',
      message:
        "/deepseek what do you think about Alex's challenge idea? How could we make it more engaging for Gen Z?",
      timestamp: '15 sec ago',
    },
    {
      user: 'DeepSeek AI',
      role: 'Member',
      message:
        "Alex's challenge idea is solid! To make it more Gen Z-friendly: 1) Add gamification with point systems and leaderboards, 2) Create shareable templates/graphics for easy participation, 3) Partner with Gen Z creators to kickstart it, 4) Offer meaningful rewards like donations to environmental causes in winners' names, 5) Use trending audio/music on platforms. The key is making participation feel effortless and socially rewarding.",
      timestamp: '10 sec ago',
    },
    {
      user: 'Sarah',
      role: 'Creator',
      message:
        'This is great! I especially like the donation rewards idea - it aligns with their values perfectly.',
      timestamp: '5 sec ago',
    },
    {
      user: 'Alex',
      role: 'Contributor',
      message: '/deepseek how should we measure success for this type of campaign?',
      timestamp: 'just now',
    },
    {
      user: 'DeepSeek AI',
      role: 'Member',
      message:
        'For measuring success, track these key metrics: 1) Participation rate (# of challenge entries), 2) Engagement quality (comments, shares, saves vs just likes), 3) User-generated content volume and reach, 4) Brand mention sentiment analysis, 5) Conversion rate from challenge participants to customers, 6) Community growth across platforms, 7) Long-term brand recall surveys. Focus on authentic engagement over vanity metrics - Gen Z sees through inflated numbers.',
      timestamp: 'just now',
    },
  ];

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % chatMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  });

  return (
    <section id="demo" className="py-20 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-foreground">See Collaboration in Action</h2>
          <p className="text-xl text-muted-foreground">
            Watch how teams work together with AI in real-time
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden max-w-4xl mx-auto">
          <div className="bg-card/80 px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Marketing Campaign Brainstorm</h3>
              <p className="text-sm text-muted-foreground">3 members</p>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <div ref={chatContainerRef} className="p-6 space-y-6 h-96 overflow-y-auto">
            {chatMessages.map((msg, index) => (
              <ChatMessage
                key={`${msg.user}-${msg.timestamp}`}
                message={msg}
                isVisible={index <= currentMessage}
              />
            ))}
          </div>

          <div className="border-t border-border p-4">
            <div className="bg-input rounded-lg px-4 py-2 flex items-center space-x-2">
              <input
                type="text"
                placeholder="Add to the conversation..."
                className="flex-1 bg-transparent text-foreground placeholder-muted-foreground border-none outline-none"
              />
              <button type="button" className="text-primary hover:text-primary/80">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
