'use client';

import { useState } from 'react';

interface ApiKeyRecord {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  enabled: boolean;
}

export default function RealmApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [label, setLabel] = useState('export-tool');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadKeys = async () => {
    const res = await fetch('/api/admin/realm-api-keys');
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys ?? []);
    }
  };

  const createKey = async () => {
    setLoading(true);
    setError('');
    setNewKey(null);
    try {
      const res = await fetch('/api/admin/realm-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create key');
      setNewKey(data.key);
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-xl font-bold">Realm Export API Keys</h2>
      <p className="text-sm text-gray-600">
        Used by the Java export tool to allocate session IDs and upload bundles. Keys are shown once when created.
      </p>

      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Label</label>
          <input
            className="border rounded px-3 py-2"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={createKey}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Generate API key'}
        </button>
        <button type="button" onClick={loadKeys} className="border px-4 py-2 rounded">
          Refresh list
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {newKey && (
        <div className="bg-amber-50 border border-amber-300 rounded p-4">
          <p className="font-semibold text-sm mb-2">Copy this key now — it will not be shown again:</p>
          <code className="block break-all text-sm bg-white p-2 border rounded">{newKey}</code>
        </div>
      )}

      {keys.length > 0 && (
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-2">Label</th>
              <th className="text-left p-2">Prefix</th>
              <th className="text-left p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-t">
                <td className="p-2">{k.label}</td>
                <td className="p-2 font-mono">{k.prefix}…</td>
                <td className="p-2">{new Date(k.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="text-sm text-gray-700 border-t pt-4">
        <p className="font-medium mb-1">API endpoints</p>
        <ul className="list-disc ml-5 space-y-1 font-mono text-xs">
          <li>POST /api/realm/v1/sessions/allocate</li>
          <li>PUT /api/realm/v1/sessions/&#123;sessionId&#125;/bundle</li>
          <li>GET /api/realm/v1/sessions/&#123;sessionId&#125;</li>
        </ul>
        <p className="mt-2">Authorization: Bearer &lt;api-key&gt;</p>
      </div>
    </div>
  );
}
