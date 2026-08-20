"use client";

import { useState, useMemo } from "react";
import { User, Search, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import useSWR from "swr";
import { ContactTable, ContactItem } from "./contact-table";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  category: "personal",
};

export function ContactTab() {
  const { data: contactsData, mutate: mutateContacts, isLoading } = useSWR('/api/contacts', (url: string) => fetch(url).then(res => res.json()));
  const contacts: ContactItem[] = contactsData?.contacts || [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [form, setForm] = useState(emptyForm);
  const [openDrawer, setOpenDrawer] = useState(false);

  // Extract unique categories from contacts
  const categories = useMemo(() => {
    const set = new Set(contacts.map(c => c.category || "personal"));
    return Array.from(set);
  }, [contacts]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      const cat = contact.category || "personal";
      const matchesCategory = categoryFilter === "all" || cat === categoryFilter;

      const searchable = `${contact.name} ${contact.phone || ""} ${contact.email || ""} ${cat}`.toLowerCase();

      return (
        matchesCategory &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [contacts, query, categoryFilter]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpenDrawer(false);
  };

  const submitContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const name = form.name.trim();
    if (!name) {
      toast.error("Name is required.");
      return;
    }
    if (!form.phone && !form.email) {
      toast.error("Please provide either a phone number or an email.");
      return;
    }
    if (form.phone && form.email) {
      toast.error("Please save either a phone number OR an email per contact, not both.");
      return;
    }

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          category: form.category || "personal",
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save contact");

      toast.success(editingId ? "Contact updated." : "Contact saved.");
      mutateContacts();
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const editContact = (contact: ContactItem) => {
    setEditingId(contact._id);
    setForm({
      name: contact.name,
      phone: contact.phone || "",
      email: contact.email || "",
      category: contact.category || "personal",
    });
    setOpenDrawer(true);
  };

  const deleteContact = async (id: string) => {
    try {
      const res = await fetch(`/api/contacts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to delete contact");
      
      toast.success("Contact removed.");
      mutateContacts();
      if (editingId === id) {
        resetForm();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-base font-semibold text-app-text-primary tracking-tight">Contacts</h2>
            <p className="text-[13px] text-app-text-muted mt-1">
              Manage the contacts Jarvis can use to send messages or emails.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setOpenDrawer(true);
            }}
            className="flex items-center gap-2 px-4 py-1.5 bg-app-surface-elevated border border-transparent hover:border-app-border-default/50 rounded-full text-[13px] font-medium text-app-text-primary transition-all cursor-pointer shadow-sm"
          >
            <Plus className="size-3.5" />
            Add Contact
          </button>
        </div>

        <div className="space-y-6">

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-app-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search names, emails, phones..."
                className="h-9 w-full rounded-full border border-transparent bg-app-surface-elevated pl-9 pr-3 text-[13px] text-app-text-primary outline-none placeholder:text-app-text-muted focus:border-app-border-default transition-all"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-full border border-transparent bg-app-surface-elevated px-4 text-[13px] text-app-text-primary outline-none focus:border-app-border-default cursor-pointer capitalize"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>

          <div className=" rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="flex h-40 flex-col items-center justify-center text-app-text-primary">
                <div className="size-6 rounded-full border-2 border-app-border-default border-t-brand-primary animate-spin mb-3" />
                <span className="text-xs uppercase tracking-widest text-app-text-ghost">Loading</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <User className="size-8 text-app-text-ghost mb-3" />
                <h3 className="text-sm font-medium text-app-text-primary">No contacts found</h3>
                <p className="text-xs text-app-text-muted mt-1">Try adjusting your search or add a new contact.</p>
              </div>
            ) : (
              <div className="[&_table]:text-sm">
                <ContactTable
                  data={filteredContacts}
                  onEdit={editContact}
                  onDelete={deleteContact}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DRAWER FOR ADDING/EDITING CONTACT */}
      <div
        className={cn(
          "fixed inset-0 z-[100] transition-all duration-300 flex items-center justify-center p-4",
          openDrawer ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div
          onClick={resetForm}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        <div
          className={cn(
            "relative w-full max-w-lg bg-app-surface border border-app-border-default/30 rounded-2xl shadow-2xl transition-transform duration-300 ease-out",
            openDrawer ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
          )}
        >
          <form onSubmit={submitContact} className="flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 md:px-8 md:pt-6 border-b border-transparent">
              <h2 className="font-semibold text-base text-app-text-primary tracking-tight">
                {editingId ? "Edit Contact" : "Add Contact"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 rounded-md text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:px-8 space-y-5">
              <div>
                <label className="text-[13px] text-app-text-primary block mb-2">
                  Full name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="w-full h-9 rounded-full border border-transparent bg-app-surface-elevated px-4 text-[13px] outline-none focus:border-app-border-default transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[13px] text-app-text-primary block mb-2">
                  Phone <span className="text-app-text-muted">(Required if no email)</span>
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. +1234567890"
                  className="w-full h-9 rounded-full border border-transparent bg-app-surface-elevated px-4 text-[13px] outline-none focus:border-app-border-default transition-all"
                />
              </div>

              <div>
                <label className="text-[13px] text-app-text-primary block mb-2">
                  Email <span className="text-app-text-muted">(Required if no phone)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g. john@example.com"
                  className="w-full h-9 rounded-full border border-transparent bg-app-surface-elevated px-4 text-[13px] outline-none focus:border-app-border-default transition-all"
                />
              </div>
              
              <p className="text-[11px] text-app-text-muted">
                Note: A contact can only have either a phone number OR an email. Do not provide both.
              </p>

              <div>
                <label className="text-[13px] text-app-text-primary block mb-2">
                  Category
                </label>
                <input
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g. personal, work"
                  className="w-full h-9 rounded-full border border-transparent bg-app-surface-elevated px-4 text-[13px] outline-none focus:border-app-border-default transition-all"
                />
              </div>
            </div>

            <div className="p-5 md:px-8 border-t border-app-border-default/20 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-1.5 text-[13px] font-medium text-app-text-muted hover:text-app-text-primary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!form.name.trim() || (!form.phone.trim() && !form.email.trim()) || (!!form.phone.trim() && !!form.email.trim())}
                className="px-5 py-1.5 rounded-full bg-app-text-primary text-app-surface text-[13px] font-medium hover:bg-app-text-secondary transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                {editingId ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
