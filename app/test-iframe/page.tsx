"use client";
import { useEffect } from 'react';

export default function TestIframePage() {
  useEffect(() => {
    // Test if we're in an iframe
    const isInIframe = window.parent !== window;
    console.log('Is in iframe:', isInIframe);
    
    if (isInIframe) {
      // Send a test message to parent
      window.parent.postMessage({
        type: 'navigate',
        url: '/characters/White%20Knight'
      }, '*');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-serif text-[#6b3e26] mb-4">Iframe Test Page</h1>
        <p className="text-[#4b3a1e] font-serif">
          This page should send a navigation message to the parent window.
        </p>
        <p className="text-sm text-[#6b3e26] mt-2">
          Check the console for iframe detection.
        </p>
      </div>
    </div>
  );
} 