'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://foikiiarpvflmfdamlcz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvaWtpaWFycHZmbG1mZGFtbGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM3NDYwNTAsImV4cCI6MjAzOTMyMjA1MH0.aj1iLuPjhXH51hbKUK8G0RLn7hIFNu2EJz66S5uY_ng'
);

export default function MenuPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const { data, error } = await supabase.from('menu_items').select('*');
      if (error) console.error(error);
      setItems(data || []);
      setLoading(false);
    }
    fetchAll();
  }, []);

  return (
    <main className="p-6 max-w-md mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4 text-center">Digital Menu</h1>
      {loading ? (
        <p className="text-center text-gray-500">Loading items...</p>
      ) : items.length === 0 ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-center">
          <p className="font-bold">0 items found in database.</p>
          <p className="text-sm mt-1">
            Your Supabase <code className="bg-red-100 px-1">menu_items</code> table is currently empty.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-green-600 font-semibold text-center">
            Successfully loaded {items.length} items from Supabase:
          </p>
          {items.map((item, idx) => (
            <div key={item.id || idx} className="p-4 bg-white rounded-xl shadow border border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">{item.title || item.name || 'Unnamed Item'}</h3>
                <span className="font-semibold text-black">₦{item.base_price || item.price || 0}</span>
              </div>
              {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}