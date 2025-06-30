'use client';

import SessionMap from '../../components/SessionMap';

export default function TestMapPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Test Map Page</h1>
      <div className="w-full h-96 border-2 border-gray-300">
        <SessionMap sessionId="learning-woodsgirl" />
      </div>
    </div>
  );
} 