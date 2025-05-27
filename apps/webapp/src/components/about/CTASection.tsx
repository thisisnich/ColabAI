import { Share2 } from 'lucide-react';
import { BetaApplicationForm } from './BetaApplicationForm';

// CTA Section Component
export const CTASection = () => {
  return (
    <section className="py-20 px-6 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
          Ready to Transform Your Team's AI Experience?
        </h2>
        <p className="text-xl text-muted-foreground mb-10">
          Join the beta and be among the first teams to experience collaborative AI intelligence.
        </p>
        <div className="flex justify-center">
          <BetaApplicationForm
            buttonText="Join the Beta"
            buttonClassName="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/90 transition-all duration-200 flex items-center space-x-2"
            icon={<Share2 className="w-5 h-5" />}
          />
        </div>
      </div>
    </section>
  );
};
