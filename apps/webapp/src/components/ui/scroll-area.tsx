import * as React from 'react';

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 ${className || ''}`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6',
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

// Custom CSS for webkit browsers (Chrome, Safari, etc.)
const scrollAreaStyles = `
  .scroll-area::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .scroll-area::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 4px;
  }
  
  .scroll-area::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }
  
  .scroll-area::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
  
  .scroll-area::-webkit-scrollbar-corner {
    background: #f3f4f6;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('scroll-area-styles')) {
  const style = document.createElement('style');
  style.id = 'scroll-area-styles';
  style.textContent = scrollAreaStyles;
  document.head.appendChild(style);
}

export { ScrollArea };
