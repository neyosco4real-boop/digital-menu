'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';

interface Category {
  id: string;
  name: string;
  section: string;
}

interface ItemVariant {
  id: string;
  item_id: string;
  variant_label: string;
  price: number;
}

interface MenuItem {
  id: string;
  title: string;
  description: string | null;
  base_price: number;
  category_id: string;
  categories?: { section: string } | { section: string }[];
  item_variants?: ItemVariant[];
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('Restaurant');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1. Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*');
      
      console.log('Fetched categories:', catData);
      if (catError) console.log('Category error:', catError);
      if (catData) setCategories(catData);

      // 2. Fetch menu items with joined categories section & variants
      const { data: itemData, error: itemError } = await supabase
        .from('menu_items')
        .select('*, categories!inner(section), item_variants(*)');

      console.log('Fetched items:', itemData);
      console.log('Fetch error:', itemError);

      if (itemData) setMenuItems(itemData as unknown as MenuItem[]);

      setLoading(false);
    }

    fetchData();
  }, []);

  // Filter items matching activeTab (handles single object or array return, plus case-insensitivity)
  const filteredItems = menuItems.filter((item) => {
    const rawSection = Array.isArray(item.categories)
      ? item.categories[0]?.section
      : item.categories?.section;

    return rawSection?.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <main className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-1">Digital Menu</h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Select a section to view menu
      </p>

      {/* Category Tabs */}
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

      {/* Menu Item Display */}
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
                  ₦{item.base_price.toLocaleString()}
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