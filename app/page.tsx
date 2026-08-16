'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://foikiiarpvflmfdamlcz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvaWtpaWFycHZmbG1mZGFtbGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM3NDYwNTAsImV4cCI6MjAzOTMyMjA1MH0.aj1iLuPjhXH51hbKUK8G0RLn7hIFNu2EJz66S5uY_ng'
);

interface MenuItem {
  id: string;
  title: string;
  description: string | null;
  base_price: number;
  category_id: string | null;
  categories?: { section: string; name: string } | null;
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Restaurant');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenu() {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, categories(*)');

      if (error) {
        console.error('Supabase error:', error);
      } else {
        setMenuItems((data as MenuItem[]) || []);
      }
      setLoading(false);
    }
    fetchMenu();
  }, []);

  const filteredItems = menuItems.filter((item) => {
    // Default unassigned items to 'Restaurant' tab so everything displays
    const itemSection = item.categories?.section || 'Restaurant';
    const matchesSection = itemSection.toLowerCase() === activeTab.toLowerCase();
    
    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSection && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto font-sans">
      <h1 className="text-2xl font-bold text-center mb-1 text-gray-900">Digital Menu</h1>
      <p className="text-sm text-gray-500 text-center mb-4">Select a section or search below</p>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm bg-white"
        />
      </div>

      {/* Section Filter Tabs */}
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

      {/* Item Rendering */}
      {loading ? (
        <p className="text-center text-gray-500 my-8">Loading menu...</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-center text-gray-400 my-8">No items found in this section.</p>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-900 text-base">{item.title}</h3>
                <span className="font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md text-sm">
                  ₦{item.base_price ? item.base_price.toLocaleString() : '0'}
                </span>
              </div>
              {item.description && (
                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}