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
  categories?: { section: string };
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
      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) setCategories(catData);

      // 2. Fetch menu items with joined categories section & variants
      const { data: itemData } = await supabase
        .from('menu_items')
        .select('*, categories!inner(section), item_variants(*)');

      if (itemData) setMenuItems(itemData as unknown as MenuItem[]);

      setLoading(false);
    }

    fetchData();
  }, []);

  // Filter items based on active section tab
  const filteredItems = menuItems.filter(
    (item) => item.categories?.section === activeTab
  );

  return (
    <main className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
      {/* Category Tabs */}
      <div className="flex justify-around mb-6 border-b pb-2">
        {['Restaurant', 'Bar', 'Hotel'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`font-semibold pb-1 ${
              activeTab === tab
                ? 'border-b-2 border-black text-black'
                : 'text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Menu List */}
      {loading ? (
        <p className="text-center text-gray-500">Loading menu...</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-center text-gray-500">No items available in this section.</p>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-4 bg-white rounded-lg shadow-sm border">
              <h3 className="font-bold text-lg">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              )}
              <p className="font-semibold text-gray-900 mt-2">
                ₦{item.base_price.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}