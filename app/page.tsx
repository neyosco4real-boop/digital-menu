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

const WHATSAPP_PHONE = '2348000000000'; // Replace with your WhatsApp number

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
  image_url?: string | null;
}

interface CartItem {
  id: string;
  title: string;
  variantLabel?: string;
  price: number;
  quantity: number;
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ItemVariant[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [tableNumber, setTableNumber] = useState('1');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
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

  // Returns section icon based on section name
  const getSectionIcon = (sectionName?: string | null) => {
    const section = sectionName?.toLowerCase() || '';
    if (section === 'bar') return '🍹';
    if (section === 'hotel') return '🏨';
    if (section === 'restaurant') return '🍽️';
    return '✨';
  };

  // Cart Functions
  const addToCart = (
    itemId: string,
    title: string,
    price: number,
    variantLabel?: string
  ) => {
    const cartId = variantLabel ? `${itemId}-${variantLabel}` : itemId;
    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.id === cartId);
      if (existing) {
        return prevCart.map((c) =>
          c.id === cartId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prevCart,
        { id: cartId, title, variantLabel, price, quantity: 1 },
      ];
    });
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === cartId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;

    let text = `*NEW ORDER - TABLE ${tableNumber}*\n------------------------------\n`;
    cart.forEach((item, index) => {
      const sizeStr = item.variantLabel ? ` (${item.variantLabel})` : '';
      text += `${index + 1}. *${item.title}${sizeStr}* x${item.quantity} - ₦${(
        item.price * item.quantity
      ).toLocaleString()}\n`;
    });
    text += `------------------------------\n*TOTAL:* ₦${cartTotal.toLocaleString()}\n\nPlease confirm my order!`;

    window.open(
      `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  const currentUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?table=${tableNumber}`
      : '';

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    currentUrl
  )}&color=d97706&bgcolor=18181b`;

  const tabs = [
    { name: 'All', icon: '✨' },
    { name: 'Restaurant', icon: '🍽️' },
    { name: 'Bar', icon: '🍹' },
    { name: 'Hotel', icon: '🏨' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased pb-28">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border-b border-zinc-800/80 pt-8 pb-6 px-4 text-center overflow-hidden">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-md mx-auto">
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

          {/* Table Selector & QR Generator Trigger */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs">
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl">
              <span className="text-zinc-400">Table:</span>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-8 bg-transparent text-amber-400 font-bold text-center focus:outline-none"
              />
            </div>

            <button
              onClick={() => setIsQRModalOpen(true)}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all"
            >
              <span>📷</span>
              <span>QR Code</span>
            </button>
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

        {/* Sticky Icon Tabs */}
        <div className="sticky top-2 z-30 mb-5 bg-zinc-950/80 backdrop-blur-xl p-1.5 rounded-2xl border border-zinc-800/80 shadow-2xl flex gap-1.5 overflow-x-auto">
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
              const sectionIcon = getSectionIcon(section);

              return (
                <div
                  key={item.id}
                  className="group p-4 bg-zinc-900/80 hover:bg-zinc-900 backdrop-blur-md rounded-2xl border border-zinc-800/80 hover:border-amber-500/40 transition-all duration-200 shadow-lg flex gap-3.5 items-center"
                >
                  {/* Dynamic Thumbnail matching Section Icon */}
                  <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center text-2xl shadow-inner">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{sectionIcon}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors truncate">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Single Base Price Button */}
                    {itemVariants.length === 0 && item.base_price !== null && (
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="font-extrabold text-amber-400 text-xs">
                          ₦{Number(item.base_price).toLocaleString()}
                        </span>
                        <button
                          onClick={() =>
                            addToCart(
                              item.id,
                              item.title,
                              Number(item.base_price)
                            )
                          }
                          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/10 active:scale-95"
                        >
                          + Add
                        </button>
                      </div>
                    )}

                    {/* Item Variants List */}
                    {itemVariants.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/80 space-y-1.5">
                        {itemVariants.map((variant) => (
                          <div
                            key={variant.id}
                            className="flex justify-between items-center text-xs"
                          >
                            <span className="text-zinc-400 text-[11px]">
                              {variant.variant_label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-amber-400 text-[11px]">
                                ₦{Number(variant.price).toLocaleString()}
                              </span>
                              <button
                                onClick={() =>
                                  addToCart(
                                    item.id,
                                    item.title,
                                    Number(variant.price),
                                    variant.variant_label
                                  )
                                }
                                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/10 active:scale-95"
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Trigger */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-extrabold p-3.5 rounded-2xl shadow-2xl shadow-amber-500/25 flex items-center justify-between transition-all active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-zinc-950 text-amber-400 text-xs px-2.5 py-1 rounded-xl font-black">
                {cartItemCount}
              </span>
              <span className="text-xs tracking-wide uppercase">
                View Order
              </span>
            </div>
            <span className="text-sm">₦{cartTotal.toLocaleString()} →</span>
          </button>
        </div>
      )}

      {/* Slide-Up Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center">
          <div className="bg-zinc-900 border-t border-zinc-800 w-full max-w-md rounded-t-3xl p-5 space-y-4 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h2 className="font-extrabold text-white text-base">
                  Your Order (Table {tableNumber})
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Review items before sending to WhatsApp
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-full text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Cart Items Scroll Container */}
            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-zinc-950 p-3 rounded-2xl border border-zinc-800/80"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {item.title}
                    </h4>
                    {item.variantLabel && (
                      <span className="text-[10px] text-zinc-400">
                        {item.variantLabel}
                      </span>
                    )}
                    <p className="text-xs font-semibold text-amber-400 mt-0.5">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-white px-1">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total and Checkout */}
            <div className="border-t border-zinc-800 pt-3 space-y-3">
              <div className="flex justify-between items-center text-sm font-extrabold text-white">
                <span>Total Amount</span>
                <span className="text-amber-400 text-base">
                  ₦{cartTotal.toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleWhatsAppCheckout}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all"
              >
                <span>💬</span>
                <span>Send Order to WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table QR Code Generator Modal */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-xs w-full rounded-3xl p-6 text-center space-y-4">
            <h3 className="font-extrabold text-white text-base">
              Table {tableNumber} QR Code
            </h3>
            <p className="text-xs text-zinc-400">
              Scan with phone camera to open this menu for Table {tableNumber}.
            </p>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 inline-block">
              <img
                src={qrCodeUrl}
                alt="Table QR Code"
                className="w-48 h-48 mx-auto rounded-xl shadow-md"
              />
            </div>

            <button
              onClick={() => setIsQRModalOpen(false)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}