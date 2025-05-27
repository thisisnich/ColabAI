'use client';
import BetaApplicationForm from '@/components/about/BetaApplicationForm'; // Adjust import path as needed
import { CTASection } from '@/components/about/CTASection';
import DemoSection from '@/components/about/DemoSection';
import { FeaturesSection } from '@/components/about/FeaturesSection';
import { Footer } from '@/components/about/Footer';
import { Header } from '@/components/about/Header';
import { HeroSection } from '@/components/about/HeroSection';
import { PricingSection } from '@/components/about/PricingSection';
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
import { useEffect, useRef, useState } from 'react';

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
