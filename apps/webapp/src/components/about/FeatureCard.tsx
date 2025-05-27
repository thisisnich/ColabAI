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

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature, index, isAnimated }) => {
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
