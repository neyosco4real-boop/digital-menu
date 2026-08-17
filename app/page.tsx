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
  base_price: number | null;
  category_id: string | null;
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ItemVariant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setFetchError(null);

      const [catRes, itemRes, varRes] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('menu_items').select('*'),
        supabase.from('item_variants').select('*'),
      ]);

      if (catRes.error || itemRes.error || varRes.error) {
        setFetchError(
          catRes.error?.message ||
            itemRes.error?.message ||
            varRes.error?.message ||
            'Failed to load menu data.'
        );
      } else {
        setCategories((catRes.data as Category[]) || []);
        setMenuItems((itemRes.data as MenuItem[]) || []);
        setVariants((varRes.data as ItemVariant[]) || []);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  const categoryMap = new Map(categories.map((c) => [c.id, c.section]));

  const variantsByItemId = new Map<string, ItemVariant[]>();
  variants.forEach((v) => {
    const existing = variantsByItemId.get(v.item_id) || [];
    existing.push(v);
    variantsByItemId.set(v.item_id, existing);
  });

  const filteredItems = menuItems.filter((item) => {
    const section =
      (item.category_id ? categoryMap.get(item.category_id) : 'Bar') || 'Bar';
    const matchesSection =
      activeTab === 'All' ||
      section.toLowerCase() === activeTab.toLowerCase();

    const itemVariants = variantsByItemId.get(item.id) || [];
    const variantMatches = itemVariants.some((v) =>
      v.variant_label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variantMatches;

    return matchesSection && matchesSearch;
  });

  // Category badge accent color selector
  const getBadgeStyle = (sectionName: string) => {
    const section = sectionName.toLowerCase();
    if (section === 'bar') {
      return 'bg-amber-100 text-amber-800 border-amber-200/80';
    }
    if (section === 'restaurant') {
      return 'bg-rose-100 text-rose-800 border-rose-200/80';
    }
    if (section === 'hotel') {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200/80';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-gray-100 p-4 max-w-md mx-auto font-sans text-gray-800 antialiased">
      {/* Header */}
      <div className="text-center my-4">
        <span className="inline-block px-3 py-1 text-[11px] font-extrabold tracking-widest uppercase rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 mb-2 shadow-sm">
          Welcome
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Digital Menu
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Explore our selections below
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-5">
        <input
          type="text"
          placeholder="Search items, drinks, or sizes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-sm bg-white/80 backdrop-blur-md shadow-sm transition-all duration-200 placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full bg-slate-100"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1 mb-6 bg-slate-200/70 p-1.5 rounded-2xl backdrop-blur-sm shadow-inner">
        {['All', 'Restaurant', 'Bar', 'Hotel'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 text-xs font-bold rounded-xl transition-all duration-300 transform active:scale-95 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-md scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Fetching menu...</p>
        </div>
      ) : fetchError ? (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-center text-sm border border-rose-100 shadow-sm">
          <p className="font-bold">Unable to load menu</p>
          <p className="text-xs mt-1 text-rose-500">{fetchError}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white/50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-sm font-semibold text-slate-400">
            No items matched your search.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredItems.map((item) => {
            const section = item.category_id
              ? categoryMap.get(item.category_id)
              : null;
            const itemVariants = variantsByItemId.get(item.id) || [];

            return (
              <div
                key={item.id}
                className="p-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md border border-slate-100 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {item.title}
                    </h3>
                    {section && activeTab === 'All' && (
                      <span
                        className={`inline-block text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full border mt-1.5 shadow-2xs ${getBadgeStyle(
                          section
                        )}`}
                      >
                        {section}
                      </span>
                    )}
                  </div>

                  {/* Single Base Price Badge */}
                  {itemVariants.length === 0 && item.base_price !== null && (
                    <span className="font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 px-3 py-1 rounded-full text-xs whitespace-nowrap shadow-2xs">
                      ₦{Number(item.base_price).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Optional Item Description */}
                {item.description && (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* Variant List (Sizes & Prices) */}
                {itemVariants.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                    {itemVariants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex justify-between items-center text-xs p-1.5 rounded-lg hover:bg-slate-50/80 transition-colors duration-150"
                      >
                        <span className="text-slate-600 font-semibold">
                          {variant.variant_label}
                        </span>
                        <span className="font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-[11px] shadow-2xs">
                          ₦{Number(variant.price).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}