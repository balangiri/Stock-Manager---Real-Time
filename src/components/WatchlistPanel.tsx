"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, Loader2 } from "lucide-react";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

interface WatchlistPanelProps {
  onAdd: (symbol: string, name: string) => Promise<void>;
}

export default function WatchlistPanel({ onAdd }: WatchlistPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search stocks as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (stock: SearchResult) => {
    setShowDropdown(false);
    setQuery("");
    setLoading(true);
    setError("");
    try {
      await onAdd(stock.symbol, stock.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stock");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowDropdown(false);
    setLoading(true);
    setError("");
    try {
      await onAdd(query.trim().toUpperCase(), query.trim().toUpperCase());
      setQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Search className="w-5 h-5 text-blue-500" />
        Add Stock
      </h2>
      <div className="relative" ref={dropdownRef}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or symbol... e.g. Reliance, TCS"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              disabled={loading}
            />
            {searching && (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute right-3 top-2.5" />
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add
          </button>
        </form>

        {/* Autocomplete Dropdown */}
        {showDropdown && (
          <div className="absolute z-20 top-full left-0 right-16 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {results.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => handleSelect(stock)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-gray-900 text-sm">
                    {stock.symbol}
                  </span>
                  <p className="text-xs text-gray-500 truncate max-w-[250px]">
                    {stock.name}
                  </p>
                </div>
                <span className="text-xs text-gray-400 ml-2">
                  {stock.exchange}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
