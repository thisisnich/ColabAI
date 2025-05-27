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

export const PricingPlan: React.FC<PricingPlanProps> = ({ plan }) => {
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
