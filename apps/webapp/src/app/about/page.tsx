'use client';
import {
  BarChart3,
  Brain,
  DollarSign,
  MessageSquare,
  Plus,
  Settings,
  Share2,
  Users,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

// Header Component
const Header = () => {
  return (
    <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">colabAI</span>
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <a
            href="#features"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </a>
          <a href="#demo" className="text-muted-foreground hover:text-foreground transition-colors">
            Demo
          </a>
        </div>

        <button
          type="button"
          className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all duration-200 hover:scale-105"
        >
          Join Beta
        </button>
      </nav>
    </header>
  );
};

// Hero Section Component
const HeroSection = () => {
  return (
    <section className="relative overflow-hidden py-20 px-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative max-w-6xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-foreground">
          AI That Brings
          <span className="text-primary block">Teams Together</span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto font-light">
          Shared Context, Shared Intelligence
        </p>

        <p className="text-lg text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed">
          Stop working in AI silos. colabAI enables true collaboration where your entire team can
          interact with AI together, share context, and build on each other's ideas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            type="button"
            className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105 flex items-center space-x-2"
          >
            <span>Start Collaborating</span>
            <Plus className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="border-2 border-border px-8 py-4 rounded-lg font-semibold text-lg hover:border-ring hover:bg-accent/50 transition-all duration-200 text-foreground"
          >
            Watch Demo
          </button>
        </div>
      </div>
    </section>
  );
};

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

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isVisible }) => {
  return (
    <div
      className={`transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-start space-x-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            message.user === 'DeepSeek AI'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          {message.user === 'DeepSeek AI' ? 'AI' : message.user[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-foreground">{message.user}</span>
            <span
              className={`text-xs px-2 py-1 rounded-md ${
                message.role === 'Creator'
                  ? 'bg-primary/20 text-primary'
                  : message.role === 'Member'
                    ? 'bg-accent/20 text-accent-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {message.role}
            </span>
            <span className="text-xs text-muted-foreground">{message.timestamp}</span>
          </div>
          <p className="text-foreground leading-relaxed">{message.message}</p>
        </div>
      </div>
    </div>
  );
};

// Demo Section Component
const DemoSection = () => {
  const [currentMessage, setCurrentMessage] = useState(0);

  const chatMessages = [
    {
      user: 'Sarah',
      role: 'Creator',
      message:
        "Hey team, let's brainstorm ideas for our new product launch campaign. What do you think about targeting Gen Z specifically?",
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
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % chatMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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

          <div className="p-6 space-y-6 h-96 overflow-y-auto">
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

// Feature Card Component
interface Feature {
  icon: React.ComponentType<{ className?: string }>; // For icon components like Lucide React icons
  title: string;
  description: string;
}

// Define the component props type
interface FeatureCardProps {
  feature: Feature;
  index: number;
  isAnimated: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, index, isAnimated }) => {
  return (
    <div
      data-index={index}
      className={`bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 hover:bg-card/70 transition-all duration-300 hover:scale-105 hover:border-ring ${
        isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mb-6">
        <feature.icon className="w-7 h-7 text-primary-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-4 text-foreground">{feature.title}</h3>
      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
    </div>
  );
};

// Define the feature type
interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const FeaturesSection: React.FC = () => {
  const [animatedCards, setAnimatedCards] = useState<Set<string>>(new Set());

  const features: Feature[] = [
    {
      icon: Users,
      title: 'True Collaboration',
      description:
        'Multiple team members in the same AI conversation. Everyone sees all messages, responses, and can contribute context in real-time.',
    },
    {
      icon: DollarSign,
      title: 'Cost Efficient',
      description:
        'Pay-as-you-go pricing with shared access. One person buys tokens, the whole team benefits. Save 70% compared to individual AI subscriptions.',
    },
    {
      icon: Brain,
      title: 'Shared Context',
      description:
        "No more copy-pasting between conversations. Build on each other's AI interactions with persistent, shared conversation history.",
    },
    {
      icon: Zap,
      title: 'Multi-AI Support',
      description:
        'Choose from multiple AI providers. Currently featuring DeepSeek for cost-effective, high-quality responses with more models coming soon.',
    },
    {
      icon: BarChart3,
      title: 'Transparent Usage',
      description:
        'Real-time token tracking and usage analytics. See exactly how your team uses AI with role-based permissions and spending controls.',
    },
    {
      icon: MessageSquare,
      title: 'Better Results',
      description:
        'Multiple perspectives improve AI interactions. Team brainstorming leads to better prompts, more creative solutions, and stronger outcomes.',
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const index = element.dataset.index;
            if (index) {
              setAnimatedCards((prev) => new Set([...prev, index]));
            }
          }
        }
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('[data-index]');
    for (const el of elements) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Why Teams Choose
            <span className="text-primary"> colabAI</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform how your team uses AI with collaborative intelligence that keeps everyone on
            the same page
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              isAnimated={animatedCards.has(index.toString())}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

// Pricing Plan Component

// Define the plan type
interface Plan {
  name: string;
  price: string;
  tokens: string;
  popular: boolean;
}

// Define the component props type
interface PricingPlanProps {
  plan: Plan;
}

const PricingPlan: React.FC<PricingPlanProps> = ({ plan }) => {
  return (
    <div
      className={`relative bg-card border rounded-xl p-6 text-center transition-all duration-300 hover:scale-105 ${
        plan.popular
          ? 'border-primary ring-2 ring-primary/20 bg-gradient-to-b from-primary/5 to-card'
          : 'border-border hover:border-ring'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="whitespace-nowrap bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-lg">
            ⭐ Most Popular
          </span>
        </div>
      )}

      <h3 className="text-xl font-semibold mb-4 text-foreground">{plan.name}</h3>
      <div className="text-3xl font-bold text-primary mb-2">{plan.price}</div>
      <p className="text-muted-foreground mb-6">{plan.tokens}</p>

      <button
        type="button"
        className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
          plan.popular
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        {plan.popular ? 'Get Started' : 'Choose Plan'}
      </button>
    </div>
  );
};

const PricingSection = () => {
  const plans = [
    { name: 'Starter', price: '$0.99', tokens: '10K tokens', popular: false },
    { name: 'Popular', price: '$2.49', tokens: '50K tokens', popular: true },
    { name: 'Team', price: '$6.99', tokens: '250K tokens', popular: false },
    { name: 'Enterprise', price: '$19.99', tokens: '1M tokens', popular: false },
  ];

  return (
    <section id="pricing" className="py-20 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground">
            Pay only for what you use. No monthly subscriptions, no per-seat fees.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <PricingPlan key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
};

// CTA Section Component
const CTASection = () => {
  return (
    <section className="py-20 px-6 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
          Ready to Transform Your Team's AI Experience?
        </h2>
        <p className="text-xl text-muted-foreground mb-10">
          Join the beta and be among the first teams to experience collaborative AI intelligence.
        </p>
        <button
          type="button"
          className="bg-primary text-primary-foreground px-12 py-4 rounded-lg text-xl font-semibold hover:bg-primary/90 transition-all duration-200 hover:scale-105"
        >
          Join Beta Waitlist
        </button>
      </div>
    </section>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">colabAI</span>
        </div>
        <p className="text-muted-foreground">
          &copy; 2025 Colab Technologies. Making AI accessible and collaborative for teams.
        </p>
      </div>
    </footer>
  );
};

// Main Landing Page Component

const ColabAILanding = () => {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <HeroSection />
      <DemoSection />
      <FeaturesSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default ColabAILanding;
