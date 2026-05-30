"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

export function ArticleSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get("q") || "");
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      if (query.trim()) {
        router.push(`/articles?q=${encodeURIComponent(query)}`);
      } else {
        router.push(`/articles`);
      }
    });
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-lg mx-auto mt-8">
      <div className="relative flex items-center">
        <Search className="absolute left-4 size-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles..."
          className="w-full h-14 pl-12 pr-24 rounded-full bg-background/80 backdrop-blur-md border border-white/20 text-foreground placeholder:text-muted-foreground shadow-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-lg"
        />
        <button
          type="submit"
          disabled={isPending}
          className="absolute right-2 h-10 px-6 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Search
        </button>
      </div>
    </form>
  );
}
