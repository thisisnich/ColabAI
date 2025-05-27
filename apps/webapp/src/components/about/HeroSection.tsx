import { Plus } from 'lucide-react';
import React from 'react';
import { BetaApplicationForm } from './BetaApplicationForm';

// Hero Section Component
export const HeroSection = () => {
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
          <BetaApplicationForm
            buttonText="Start Collaborating"
            buttonClassName="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105 flex items-center space-x-2"
            icon={<Plus className="w-5 h-5" />}
          />
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
