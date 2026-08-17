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

// WhatsApp Order Phone Number (Replace with your venue's WhatsApp number)
const WHATSAPP_PHONE = '2348000000000';

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

  const handleWhatsAppOrder = (itemTitle: string, size?: string, price?: number) => {
    const details = size ? `${itemTitle} (${size})` : itemTitle;
    const priceText = price ? ` for ₦${Number(price).toLocaleString()}` : '';
    const message = encodeURIComponent(`Hello! I would like to order: ${details}${priceText}.`);
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${message}`, '_blank');
  };

  const getSectionBadge = (sectionName: string) => {
    const section = sectionName.toLowerCase();
    if (section === 'bar')
      return { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: '🍺' };
    if (section === 'restaurant')
      return { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: '🍽️' };
    if (section === 'hotel')
      return { bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: '🏨' };
    return { bg: 'bg-zinc-800 text-zinc-300 border-zinc-700', icon: '✨' };
  };

  const tabs = [
    { name: 'All', icon: '✨' },
    { name: 'Restaurant', icon: '🍽️' },
    { name: 'Bar', icon: '🍹' },
    { name: 'Hotel', icon: '🏨' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased pb-20">
      {/* PK-Menu Hero Branding Header */}
      <div className="relative bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border-b border-zinc-800/80 pt-8 pb-6 px-4 text-center overflow-hidden">
        {/* Glow backdrop behind header */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-md mx-auto">
          {/* Logo Badge */}
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center font-extrabold text-amber-400 text-xl tracking-wider">
              DM
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">
            LUXURY DIGITAL MENU
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Food • Lounge • Bar • Executive Suites
          </p>

          <div className="flex items-center justify-center gap-2 mt-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Open Now
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">Fast Table Service</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search drinks, dishes, sizes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 text-xs text-white placeholder-zinc-500 backdrop-blur-md transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs bg-zinc-800 px-1.5 py-0.5 rounded-full"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sticky Horizontal Icon Tabs */}
        <div className="sticky top-2 z-30 mb-5 bg-zinc-950/80 backdrop-blur-xl p-1.5 rounded-2xl border border-zinc-800/80 shadow-2xl flex gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`flex-1 min-w-[75px] py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-zinc-500 font-medium">Loading catalog...</p>
          </div>
        ) : fetchError ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-center text-xs">
            <p className="font-bold">Database Error</p>
            <p className="mt-1">{fetchError}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800">
            <p className="text-xs text-zinc-500">No menu items found.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredItems.map((item) => {
              const section = item.category_id
                ? categoryMap.get(item.category_id)
                : null;
              const itemVariants = variantsByItemId.get(item.id) || [];
              const badge = section ? getSectionBadge(section) : null;

              return (
                <div
                  key={item.id}
                  className="group relative p-4 bg-zinc-900/80 hover:bg-zinc-900 backdrop-blur-md rounded-2xl border border-zinc-800/80 hover:border-amber-500/40 transition-all duration-200 shadow-lg"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">
                        {item.title}
                      </h3>

                      {badge && activeTab === 'All' && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md border ${badge.bg}`}
                        >
                          <span>{badge.icon}</span>
                          <span>{section}</span>
                        </span>
                      )}
                    </div>

                    {/* Single Base Price */}
                    {itemVariants.length === 0 && item.base_price !== null && (
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl text-xs whitespace-nowrap shadow-sm">
                          ₦{Number(item.base_price).toLocaleString()}
                        </span>
                        <button
                          onClick={() =>
                            handleWhatsAppOrder(item.title, undefined, item.base_price!)
                          }
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-1.5 rounded-xl text-xs transition-all"
                          title="Order on WhatsApp"
                        >
                          💬
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Item Variants List */}
                  {itemVariants.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2">
                      {itemVariants.map((variant) => (
                        <div
                          key={variant.id}
                          className="flex justify-between items-center text-xs p-2 rounded-xl bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-800/50 transition-colors"
                        >
                          <span className="text-zinc-300 font-medium">
                            {variant.variant_label}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg text-[11px]">
                              ₦{Number(variant.price).toLocaleString()}
                            </span>
                            <button
                              onClick={() =>
                                handleWhatsAppOrder(
                                  item.title,
                                  variant.variant_label,
                                  variant.price
                                )
                              }
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
                            >
                              + Order
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/80 py-2.5 px-4">
        <div className="max-w-md mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-zinc-400 font-medium">Need Assistance?</span>
          </div>
          <button
            onClick={() => handleWhatsAppOrder('General Inquiry')}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-xs"
          >
            <span>💬</span>
            <span>WhatsApp Order</span>
          </button>
        </div>
      </div>
    </div>
  );
}