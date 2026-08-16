'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://foikiiarpvflmfdamlcz.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvaWtpaWFycHZmbG1mZGFtbGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM3NDYwNTAsImV4cCI6MjAzOTMyMjA1MH0.aj1iLuPjhXH51hbKUK8G0RLn7hIFNu2EJz66S5uY_ng';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Category {
  id: string;
  name: string;
  section: string;
}

interface MenuItem {
  id: string;
  title: string;
  description: string | null;
  base_price: number;
  category_id: string | null;
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setFetchError(null);

      const [catRes, itemRes] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('menu_items').select('*'),
      ]);

      if (catRes.error || itemRes.error) {
        setFetchError(
          catRes.error?.message ||
            itemRes.error?.message ||
            'Failed to load database records'
        );
      } else {
        setCategories((catRes.data as Category[]) || []);
        setMenuItems((itemRes.data as MenuItem[]) || []);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  const categoryMap = new Map(categories.map((c) => [c.id, c.section]));

  const filteredItems = menuItems.filter((item) => {
    const section =
      (item.category_id ? categoryMap.get(item.category_id) : 'Restaurant') ||
      'Restaurant';
    const matchesSection =
      activeTab === 'All' ||
      section.toLowerCase() === activeTab.toLowerCase();
    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSection && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto font-sans">
      <h1 className="text-2xl font-bold text-center mb-1 text-gray-900">
        Digital Menu
      </h1>
      <p className="text-sm text-gray-500 text-center mb-4">
        Select a section or search below
      </p>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm bg-white text-gray-900"
        />
      </div>

      {/* Section Tabs */}
      <div className="flex justify-around mb-6 bg-gray-200 p-1 rounded-xl">
        {['All', 'Restaurant', 'Bar', 'Hotel'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`w-full py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Items Display */}
      {loading ? (
        <p className="text-center text-gray-500 my-8">Loading menu...</p>
      ) : fetchError ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-center text-sm">
          <p className="font-bold">Error fetching database:</p>
          <p>{fetchError}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center my-8">
          <p className="text-gray-400">No items found.</p>
          <p className="text-xs text-gray-400 mt-1">
            Total items in database: {menuItems.length}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const section = item.category_id
              ? categoryMap.get(item.category_id)
              : null;
            return (
              <div
                key={item.id}
                className="p-4 bg-white rounded-xl shadow-sm border border-gray-100"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {item.title}
                    </h3>
                    {section && activeTab === 'All' && (
                      <span className="inline-block text-[10px] font-semibold tracking-wide uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1">
                        {section}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md text-sm whitespace-nowrap">
                    ₦{Number(item.base_price).toLocaleString()}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-2">
                    {item.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}