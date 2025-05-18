'use client';

import { Button } from '@/components/ui/button';
import { PresentationContainer } from '@/modules/presentation/presentation-container';
import { usePresentationContext } from '@/modules/presentation/presentation-container';
import { PresentationControls } from '@/modules/presentation/presentation-controls';
import { useState } from 'react';

function Slide({ number, currentSlide }: { number: number; currentSlide: number }) {
  // Only render the slide content if it's the current slide
  if (number !== currentSlide) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold mb-10">Slide {number}</h1>
      <div className="text-xl max-w-2xl text-center">
        {number === 1 && (
          <>
            <h2 className="text-3xl mb-4">Enhanced Presenter Mode Demo</h2>
            <p className="mb-4">
              This presentation demonstrates the enhanced presenter mode with automatic joining.
            </p>
            <ul className="text-left list-disc pl-6 space-y-2">
              <li>When a presenter activates sync mode, viewers automatically join</li>
              <li>Only the presenter can control slide navigation</li>
              <li>Viewers see a different UI indicating they are in view mode</li>
              <li>The presenter can stop presenting at any time</li>
            </ul>
          </>
        )}
        {number === 2 && (
          <>
            <h2 className="text-3xl mb-4">How to Use</h2>
            <p className="mb-4">Try these features:</p>
            <ol className="text-left list-decimal pl-6 space-y-2">
              <li>Click "Start Presenting" to become a presenter</li>
              <li>Open this page in another tab to see auto-joining as a viewer</li>
              <li>Notice that viewers cannot control navigation</li>
              <li>Try copying the viewer link to share with others</li>
            </ol>
          </>
        )}
        {number === 3 && (
          <>
            <h2 className="text-3xl mb-4">Implementation Details</h2>
            <p className="mb-4">The enhanced presenter mode includes:</p>
            <ul className="text-left list-disc pl-6 space-y-2">
              <li>Role-based permissions (presenter vs viewer)</li>
              <li>Backend state for active presentations</li>
              <li>Automatic detection and joining of active presentations</li>
              <li>UI differences for presenters and viewers</li>
            </ul>
          </>
        )}
        {number === 4 && (
          <>
            <h2 className="text-3xl mb-4">Thank You!</h2>
            <p className="mb-4">
              This enhanced presenter mode creates a more natural presentation experience that works
              across multiple devices.
            </p>
            <p>
              The presenter maintains control while viewers can effortlessly join and follow along.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function PresentationContent() {
  const { currentSlide } = usePresentationContext();

  return (
    <div>
      {/* Slides */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Slide number={1} currentSlide={currentSlide} />
        <Slide number={2} currentSlide={currentSlide} />
        <Slide number={3} currentSlide={currentSlide} />
        <Slide number={4} currentSlide={currentSlide} />
      </div>

      {/* Controls */}
      <PresentationControls />
    </div>
  );
}

// Generate a unique presentation key based on the URL path
function useUniquePresentation() {
  const [key] = useState(() => {
    // Use a consistent key for this presentation
    return 'test-presentation-demo';
  });

  return key;
}

export default function PresentationTestPage() {
  const presentationKey = useUniquePresentation();

  return (
    <PresentationContainer totalSlides={4} presentationKey={presentationKey}>
      <PresentationContent />
    </PresentationContainer>
  );
}
