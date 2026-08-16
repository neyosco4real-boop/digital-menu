'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Hardcoded direct Supabase client to guarantee connection
const supabase = createClient(
  'https://foikiiarpvflmfdamlcz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvaWtpaWFycHZmbG1mZGFtbGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM3NDYwNTAsImV4cCI6MjAzOTMyMjA1MH0.aj1iLuPjhXH51hbKUK8G0RLn7hIFNu2EJz66S5uY_ng'
);

interface MenuItem {
  id: string;
  title: string;
  description: string | null;
  base_price: number;
  category_id: string;
  categories?: { section: string };
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('Restaurant');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, categories(section)');

      if (error) {
        console.error('Supabase Query Error:', error);
      } else if (data) {
        setMenuItems(data as MenuItem[]);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredItems = menuItems.filter((item) => {
    const section = item.categories?.section || '';
    return section.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <main className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-1">Digital Menu</h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Select a section to view menu
      </p>

      {/* Tabs */}
      <div className="flex justify-around mb-6 bg-gray-200 p-1 rounded-xl">
        {['Restaurant', 'Bar', 'Hotel'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`w-full py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Item List */}
      {loading ? (
        <p className="text-center text-gray-500 my-8">Loading menu...</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-center text-gray-400 my-8">
          No items available in this section.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white rounded-xl shadow-sm border border-gray-100"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded-md text-sm">
                  ₦{item.base_price?.toLocaleString()}
                </span>
              </div>
              {item.description && (
                <p className="text-sm text-gray-500 mt-2">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}