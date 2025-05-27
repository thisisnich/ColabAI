import { MessageSquare } from 'lucide-react';
// Footer Component
export const Footer = () => {
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
