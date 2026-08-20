'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://foikiiarpvflmfdamlcz.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvaWtpaWFycHZmbG1mZGFtbGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM3NDYwNTAsImV4cCI6MjAzOTMyMjA1MH0.aj1iLuPjhXH51hbKUK8G0RLn7hIFNu2EJz66S5uY_ng';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Tenant {
  id: string;
  name: string;
  slug: string;
  whatsapp_phone: string;
  currency: string;
}

interface MenuItem {
  id: string;
  title: string;
  description: string | null;
  base_price: number | null;
  category_id: string | null;
  tenant_id: string;
}

export default function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const paramsData = use(params); const slug = paramsData?.slug || "luxury-lounge";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTenant, setSavingTenant] = useState(false);
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('');

  // Form states for new item
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => {
    async function loadAdminData() {
      setLoading(true);
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (tenantData) {
        setTenant(tenantData as Tenant);
        setPhone(tenantData.whatsapp_phone || '');
        setCurrency(tenantData.currency || '₦');

        const { data: itemData } = await supabase
          .from('menu_items')
          .select('*')
          .eq('tenant_id', tenantData.id);

        setMenuItems((itemData as MenuItem[]) || []);
      }
      setLoading(false);
    }

    if (slug) loadAdminData();
  }, [slug]);

  const handleUpdateTenant = async () => {
    if (!tenant) return;
    setSavingTenant(true);

    const { error } = await supabase
      .from('tenants')
      .update({ whatsapp_phone: phone, currency })
      .eq('id', tenant.id);

    if (!error) {
      alert('Venue settings updated successfully!');
    } else {
      console.error('Tenant Update Error:', error);
      alert(`Failed to update settings: ${error.message}`);
    }
    setSavingTenant(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !newTitle || !newPrice) return;

    setAddingItem(true);
    const { data, error } = await supabase
      .from('menu_items')
      .insert([
        {
          tenant_id: tenant.id,
          title: newTitle,
          description: newDesc || null,
          base_price: parseFloat(newPrice),
        },
      ])
      .select();

    if (error) {
      console.error('Supabase Error Details:', error);
      alert(`Error adding menu item: ${error.message}`);
    } else if (data) {
      setMenuItems((prev) => [...prev, data[0] as MenuItem]);
      setNewTitle('');
      setNewDesc('');
      setNewPrice('');
    }
    setAddingItem(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (!error) {
      setMenuItems((prev) => prev.filter((item) => item.id !== itemId));
    } else {
      console.error('Delete Item Error:', error);
      alert(`Failed to delete item: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-xs text-zinc-400">
        Loading Admin Dashboard...
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-xs text-rose-400">
        Venue not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wide text-white">
            {tenant.name} — Admin
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage store settings and menu items
          </p>
        </div>
        <a
          href={`/menu/${tenant.slug}`}
          target="_blank"
          className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-amber-500/20"
        >
          View Live Menu ↗
        </a>
      </div>

      {/* Store Settings Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8 space-y-4">
        <h2 className="text-sm font-bold text-white">Store Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">
              WhatsApp Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">
              Currency Symbol
            </label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
        <button
          onClick={handleUpdateTenant}
          disabled={savingTenant}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold px-4 py-2 rounded-xl transition-all"
        >
          {savingTenant ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Add New Item Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-bold text-white mb-3">Add New Menu Item</h2>
        <form onSubmit={handleAddItem} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Item Title (e.g., Club Sandwich)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <input
              type="number"
              placeholder="Base Price (e.g., 3500)"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              required
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="Description (Optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={addingItem}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold px-4 py-2 rounded-xl transition-all"
          >
            {addingItem ? 'Adding...' : '+ Add Item'}
          </button>
        </form>
      </div>

      {/* Item List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-4">
          Current Menu Items ({menuItems.length})
        </h2>
        <div className="space-y-2">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800/60 text-xs"
            >
              <div>
                <span className="font-bold text-white block">{item.title}</span>
                {item.description && (
                  <span className="text-[11px] text-zinc-500">
                    {item.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-amber-400">
                  {currency}
                  {item.base_price?.toLocaleString()}
                </span>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
