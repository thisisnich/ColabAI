import { PricingPlan } from './PricingPlan';
export const PricingSection = () => {
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
