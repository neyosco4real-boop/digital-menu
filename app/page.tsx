'use client';

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

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
  item_variants?: ItemVariant[];
}


export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('restaurant');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // <-- ADD THIS LINE
  
useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1. Fetch categories
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (catData) setCategories(catData);

      // 2. Fetch menu items with variants
      const { data: itemData } = await supabase
        .from('menu_items')
        .select('*, item_variants(*)');
      if (itemData) setMenuItems(itemData);

      setLoading(false);
    }

    fetchData();
  }, []);

  // Place filteredItems HERE (outside useEffect, before return):
  const filteredItems = menuItems.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  });

  return (
    <main className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
      
{/* Header */}
      <header className="text-center my-6">
        <h1 className="text-3xl font-bold text-gray-800">Digital Menu</h1>
        <p className="text-sm text-gray-500">Select a section to view menu</p>
      </header>
{/* Search Bar Input */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-800 placeholder-gray-400"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Tabs Container (Restaurant / Bar / Hotel) */}
      <div className="flex bg-gray-200/80 p-1 rounded-xl mb-6">
        {/* ... your tab buttons ... */}
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-between bg-gray-200 p-1 rounded-xl mb-6">
        {['restaurant', 'bar', 'hotel'].map((section) => (
          <button
            key={section}
            onClick={() => setActiveTab(section)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${
              activeTab === section
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

     {/* Menu List */}
      {loading ? (
        <p className="text-center text-gray-500 py-10">Loading menu...</p>
      ) : categories.filter((cat) => cat.section === activeTab).length === 0 ? (
        <p className="text-center text-gray-400 py-10">No items available in this section.</p>
      ) : (
        <div>
          {categories
            .filter((cat) => cat.section === activeTab)
            .map((category) => {
              const categoryItems = filteredItems.filter(
                (item) => item.category_id === category.id
              );

              if (categoryItems.length === 0) return null;

              return (
                <div key={category.id} className="mb-6">
                  {/* Sub-category Header */}
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 px-1">
                    {category.name}
                  </h2>

                  {/* Menu Items */}
                  <div className="space-y-3">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex justify-between items-center gap-3"
                      >
                        <div>
                          <h3 className="font-semibold text-gray-800">{item.title}</h3>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                          )}

                         {/* Drink Size Badges */}
                          {item.item_variants && item.item_variants.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {item.item_variants.map((variant: any) => (
                                <span
                                  key={variant.id}
                                  className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                                >
                                  {variant.variant_label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <span className="font-bold text-emerald-600 text-sm shrink-0">
                          ₦{item.base_price?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </main>
  );
}