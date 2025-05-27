import { FeatureCard } from '@/components/about/FeatureCard';
import { BarChart3, Brain, DollarSign, MessageSquare, Users, Zap } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
// Define the feature type
interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export const FeaturesSection: React.FC = () => {
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
