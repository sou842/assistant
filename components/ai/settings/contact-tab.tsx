"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  X,
  Pencil,
  Trash2,
  Phone,
  Mail,
  User,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import useSWR from "swr";
import { formatDistanceToNow, format } from "date-fns";

export interface ContactItem {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  category?: string;
  createdAt?: string;
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  category: "personal",
};

export function ContactTab() {
  const {
    data: contactsData,
    mutate: mutateContacts,
    isLoading,
  } = useSWR("/api/contacts", (url: string) =>
    fetch(url).then((res) => res.json())
  );
  const contacts: ContactItem[] = contactsData?.contacts || [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [form, setForm] = useState(emptyForm);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [contactType, setContactType] = useState<"phone" | "email">("phone");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Extract unique categories from contacts
  const categories = useMemo(() => {
    const set = new Set(contacts.map((c) => c.category?.toLowerCase() || "personal"));
    return Array.from(set);
  }, [contacts]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      const cat = (contact.category || "personal").toLowerCase();
      const matchesCategory =
        categoryFilter === "all" || cat === categoryFilter.toLowerCase();

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
    setContactType("phone");
    setOpenDrawer(false);
  };

  const submitContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    if (!name) {
      toast.error("Name is required.");
      return;
    }

    const phoneVal = contactType === "phone" ? form.phone.trim() : undefined;
    const emailVal = contactType === "email" ? form.email.trim() : undefined;

    if (!phoneVal && !emailVal) {
      toast.error(`Please provide a valid ${contactType === "phone" ? "phone number" : "email address"}.`);
      return;
    }

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          name,
          phone: phoneVal,
          email: emailVal,
          category: form.category.trim() || "personal",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save contact");

      toast.success(editingId ? "Contact updated successfully." : "Contact saved successfully.");
      mutateContacts();
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const editContact = (contact: ContactItem) => {
    setEditingId(contact._id);
    const hasEmail = Boolean(contact.email && !contact.phone);
    setContactType(hasEmail ? "email" : "phone");
    setForm({
      name: contact.name,
      phone: contact.phone || "",
      email: contact.email || "",
      category: contact.category || "personal",
    });
    setOpenDrawer(true);
  };

  const deleteContact = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirm = window.confirm("Are you sure you want to remove this contact?");
    if (!confirm) return;

    setDeletingId(id);
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
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full w-full max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-app-border-default/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Users className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-app-text-primary tracking-tight">
                  Contacts
                </h2>
                {contacts.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-app-surface-elevated text-app-text-secondary border border-app-border-default/25">
                    {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
                  </span>
                )}
              </div>
              <p className="text-xs text-app-text-muted mt-0.5">
                People Jarvis can communicate with via WhatsApp messages or emails.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setOpenDrawer(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-app-text-primary text-app-surface hover:bg-app-text-secondary text-xs font-medium transition-all shadow-xs cursor-pointer self-start sm:self-center shrink-0"
          >
            <Plus className="size-3.5" />
            <span>Add Contact</span>
          </button>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-app-text-muted transition-colors group-focus-within:text-brand-primary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts by name, email, or phone..."
              className="w-full h-9.5 bg-app-surface-elevated/70 border border-app-border-default/20 rounded-xl pl-10 pr-9 py-1.5 text-[13px] text-app-text-primary placeholder:text-app-text-muted/70 focus:outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary/20 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-app-text-muted hover:text-app-text-primary rounded-full transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "px-3 h-9 rounded-xl text-xs font-medium border transition-all cursor-pointer whitespace-nowrap",
                categoryFilter === "all"
                  ? "bg-app-surface-elevated text-app-text-primary border-app-border-default/40 shadow-xs"
                  : "bg-app-surface-elevated/30 text-app-text-muted border-app-border-default/15 hover:text-app-text-primary hover:bg-app-surface-elevated/60"
              )}
            >
              All
            </button>
            {categories.map((c) => {
              const active = categoryFilter.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={cn(
                    "px-3 h-9 rounded-xl text-xs font-medium border transition-all cursor-pointer whitespace-nowrap capitalize",
                    active
                      ? "bg-app-surface-elevated text-app-text-primary border-app-border-default/40 shadow-xs"
                      : "bg-app-surface-elevated/30 text-app-text-muted border-app-border-default/15 hover:text-app-text-primary hover:bg-app-surface-elevated/60"
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contacts List Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[280px] max-h-[calc(70vh-190px)]">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 rounded-xl border border-app-border-default/15 bg-app-surface-elevated/20 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-app-surface-glass shrink-0" />
                  <div className="space-y-2">
                    <div className="h-4 bg-app-surface-glass rounded-md w-32" />
                    <div className="h-3 bg-app-surface-glass rounded-md w-48" />
                  </div>
                </div>
                <div className="w-16 h-7 rounded-lg bg-app-surface-glass shrink-0" />
              </div>
            ))
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4 text-center border border-dashed border-app-border-default/20 rounded-2xl bg-app-surface-elevated/10">
              <div className="p-3 rounded-2xl bg-app-surface-elevated/60 text-app-text-muted mb-2.5 border border-app-border-default/20">
                <Users className="size-5 text-app-text-muted" />
              </div>
              <h3 className="text-sm font-medium text-app-text-primary">
                {query ? "No matching contacts" : "No contacts added yet"}
              </h3>
              <p className="text-xs text-app-text-muted mt-1 max-w-sm">
                {query
                  ? `No contacts matched "${query}". Try searching another name or clear filters.`
                  : "Add contacts with their phone numbers or email addresses so Jarvis can send them messages."}
              </p>
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-3.5 px-3 py-1.5 text-xs font-medium bg-app-surface-elevated hover:bg-app-surface-elevated/80 text-app-text-primary rounded-lg border border-app-border-default/30 transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isPhone = Boolean(contact.phone);
              const initials = contact.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={contact._id}
                  onClick={() => editContact(contact)}
                  className="group relative flex items-center justify-between gap-3 p-3.5 rounded-xl border border-app-border-default/15 bg-app-surface-elevated/35 hover:bg-app-surface-elevated/75 hover:border-app-border-default/35 transition-all duration-150 cursor-pointer select-none"
                >
                  {/* Avatar & Contact Info */}
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="flex items-center justify-center size-9 rounded-full bg-app-surface-elevated text-app-text-secondary border border-app-border-default/25 font-semibold text-xs shrink-0 shadow-inner">
                      {initials || <User className="size-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13px] font-medium text-app-text-primary truncate tracking-tight">
                          {contact.name}
                        </h4>
                        {contact.category && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-app-surface-elevated/80 text-app-text-muted border border-app-border-default/20 capitalize shrink-0">
                            {contact.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        {isPhone ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="size-3 shrink-0 text-emerald-400" />
                            <span>{contact.phone}</span>
                          </span>
                        ) : contact.email ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Mail className="size-3 shrink-0 text-blue-400" />
                            <span className="truncate">{contact.email}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-app-text-muted">No details</span>
                        )}

                        {contact.createdAt && (
                          <>
                            <span className="text-app-text-muted/40">•</span>
                            <span className="text-[11px] text-app-text-muted" title={format(new Date(contact.createdAt), "PPpp")}>
                              {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        editContact(contact);
                      }}
                      className="p-1.5 text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated rounded-lg transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                      title="Edit contact"
                    >
                      <Pencil className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => deleteContact(contact._id, e)}
                      className="p-1.5 text-app-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      title="Delete contact"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DRAWER / MODAL FOR ADDING & EDITING CONTACT */}
      <div
        className={cn(
          "fixed inset-0 z-[100] transition-all duration-200 flex items-center justify-center p-4",
          openDrawer ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div
          onClick={resetForm}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        <div
          className={cn(
            "relative w-full max-w-lg bg-app-surface border border-app-border-default/30 rounded-2xl shadow-2xl transition-all duration-200 ease-out",
            openDrawer ? "scale-100 translate-y-0" : "scale-95 translate-y-3"
          )}
        >
          <form onSubmit={submitContact} className="flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 px-6 border-b border-app-border-default/20">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Users className="size-4" />
                </div>
                <h3 className="font-semibold text-sm text-app-text-primary tracking-tight">
                  {editingId ? "Edit Contact" : "Add New Contact"}
                </h3>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 rounded-md text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-medium text-app-text-secondary block mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Alex Morgan"
                  className="w-full h-9 rounded-xl border border-app-border-default/20 bg-app-surface-elevated/70 px-3 text-[13px] text-app-text-primary outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary/20 transition-all"
                />
              </div>

              {/* Type Switcher: Phone vs Email */}
              <div>
                <label className="text-xs font-medium text-app-text-secondary block mb-1.5">
                  Contact Method
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-app-surface-elevated/50 border border-app-border-default/20 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setContactType("phone");
                      setForm((prev) => ({ ...prev, email: "" }));
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-all cursor-pointer",
                      contactType === "phone"
                        ? "bg-app-surface-elevated text-app-text-primary shadow-xs border border-app-border-default/25"
                        : "text-app-text-muted hover:text-app-text-primary"
                    )}
                  >
                    <Phone className="size-3.5 text-emerald-400" />
                    <span>WhatsApp / Phone</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContactType("email");
                      setForm((prev) => ({ ...prev, phone: "" }));
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-all cursor-pointer",
                      contactType === "email"
                        ? "bg-app-surface-elevated text-app-text-primary shadow-xs border border-app-border-default/25"
                        : "text-app-text-muted hover:text-app-text-primary"
                    )}
                  >
                    <Mail className="size-3.5 text-blue-400" />
                    <span>Email Address</span>
                  </button>
                </div>
              </div>

              {/* Contact Value Input */}
              {contactType === "phone" ? (
                <div>
                  <label className="text-xs font-medium text-app-text-secondary block mb-1.5">
                    Phone Number (with country code) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. +1234567890"
                    className="w-full h-9 rounded-xl border border-app-border-default/20 bg-app-surface-elevated/70 px-3 text-[13px] text-app-text-primary outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary/20 transition-all"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-app-text-secondary block mb-1.5">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. alex@example.com"
                    className="w-full h-9 rounded-xl border border-app-border-default/20 bg-app-surface-elevated/70 px-3 text-[13px] text-app-text-primary outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary/20 transition-all"
                  />
                </div>
              )}

              {/* Category */}
              <div>
                <label className="text-xs font-medium text-app-text-secondary block mb-1.5">
                  Category (Optional)
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g. personal, work, client, family"
                  className="w-full h-9 rounded-xl border border-app-border-default/20 bg-app-surface-elevated/70 px-3 text-[13px] text-app-text-primary outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="p-4 px-6 border-t border-app-border-default/20 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!form.name.trim() || (contactType === "phone" ? !form.phone.trim() : !form.email.trim())}
                className="px-4 py-1.5 rounded-xl bg-app-text-primary text-app-surface text-xs font-medium hover:bg-app-text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {editingId ? "Update Contact" : "Save Contact"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
