"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import EntryForm from "@/components/forms/EntryForm";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useI18n } from "@/components/i18n/LanguageProvider";

const FETCH_MS = 18_000;

interface DailyEntry {
  id: string;
  date: string;
  shift: string;
  quantity: number;
  total_amount: number;
  customers: { name: string } | null;
  products: { name: string } | null;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function startOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return isoDate(d);
}

const EntriesPage = () => {
  const { t, lang } = useI18n();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<
    { id: number; name: string; default_rate: number }[]
  >([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  const [dateFrom, setDateFrom] = useState<string>(startOfMonthISO());
  const [dateTo, setDateTo] = useState<string>(isoDate(new Date()));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const q = search.trim();
    const handle = setTimeout(() => setDebouncedSearch(q), 350);
    return () => clearTimeout(handle);
  }, [search]);

  const fetchEntries = useCallback(async () => {
    try {
      setIsLoadingEntries(true);
      const { data, error, count } = await withTimeout(
        (() => {
          let q = supabaseClient
            .from("entries")
            .select(
              debouncedSearch
                ? "id, date, shift, quantity, total_amount, customers!inner(name), products(name)"
                : "id, date, shift, quantity, total_amount, customers(name), products(name)",
              { count: "exact" }
            )
            .order("date", { ascending: false })
            .order("id", { ascending: false });

          if (dateFrom) q = q.gte("date", dateFrom);
          if (dateTo) q = q.lte("date", dateTo);

          if (debouncedSearch) {
            // Force inner join so non-matching / missing customers disappear from results
            q = q.ilike("customers.name", `%${debouncedSearch}%`);
          }

          return q;
        })(),
        FETCH_MS
      );

      if (error) {
        console.error("[EntriesPage] error fetching entries", error);
        return error;
      }
      setEntries((data as unknown as DailyEntry[]) || []);
      setFilteredCount(typeof count === "number" ? count : (data as any[])?.length ?? 0);
      return null;
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to load entries");
      return err;
    } finally {
      setIsLoadingEntries(false);
    }
  }, [dateFrom, dateTo, debouncedSearch]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadError(null);
      try {
        const { count: total, error: totalErr } = await withTimeout(
          supabaseClient.from("entries").select("id", { count: "exact", head: true }),
          FETCH_MS
        );
        if (totalErr) {
          console.error("[EntriesPage] error fetching total entries count", totalErr);
          setTotalCount(null);
        } else {
          setTotalCount(typeof total === "number" ? total : null);
        }

        const { data: customersData, error: cErr } = await withTimeout(
          supabaseClient.from("customers").select("id, name"),
          FETCH_MS
        );
        const { data: productsData, error: pErr } = await withTimeout(
          supabaseClient.from("products").select("id, name, default_rate"),
          FETCH_MS
        );

        if (cErr || pErr) {
          setLoadError(cErr?.message ?? pErr?.message ?? "Could not load form data");
          setCustomers([]);
          setProducts([]);
          return;
        }

        setCustomers(customersData || []);
        setProducts(productsData || []);
        const entryErr = await fetchEntries();
        if (entryErr) {
          setLoadError(entryErr.message);
        }
      } catch (e) {
        console.error(e);
        setLoadError(e instanceof Error ? e.message : "Failed to load page");
        setCustomers([]);
        setProducts([]);
      }
    };

    fetchData();
  }, [fetchEntries]);

  useEffect(() => {
    // Refetch when filters change (after initial load)
    fetchEntries();
  }, [fetchEntries]);

  const handleEntrySaved = () => {
    setIsEntryModalOpen(false);
    fetchEntries();
  };

  return (
    <div className="space-y-6">
      <Modal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title={lang === "hi" ? "नई एंट्री जोड़ें" : "Add New Entry"}
      >
        {customers.length === 0 || products.length === 0 ? (
          <p className="text-muted-foreground py-2">
            Add at least one customer and one product before recording entries.
          </p>
        ) : (
          <EntryForm
            customers={customers}
            products={products}
            onSuccess={handleEntrySaved}
          />
        )}
      </Modal>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold text-foreground">{t("entries.title")}</h1>
        <Button type="button" onClick={() => setIsEntryModalOpen(true)}>
          {lang === "hi" ? "एंट्री जोड़ें" : "Add Entry"}
        </Button>
      </div>
      {loadError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {loadError}
        </p>
      )}

      <Card title={lang === "hi" ? "एंट्री फ़िल्टर" : "Filters"}>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {lang === "hi" ? "तारीख (से)" : "Date from"}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 rounded-md border border-border bg-white/90 px-3 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {lang === "hi" ? "तारीख (तक)" : "Date to"}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 rounded-md border border-border bg-white/90 px-3 text-sm"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {lang === "hi" ? "ग्राहक खोजें" : "Search customer"}
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "hi" ? "नाम से खोजें" : "Search by customer name"}
              className="h-10 w-full rounded-md border border-border bg-white/90 px-3 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDateFrom(startOfMonthISO());
                setDateTo(isoDate(new Date()));
                setSearch("");
              }}
            >
              {lang === "hi" ? "रीसेट" : "Reset"}
            </Button>
            <Button type="button" variant="outline" onClick={() => fetchEntries()}>
              {lang === "hi" ? "रिफ्रेश" : "Refresh"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {isLoadingEntries
            ? lang === "hi"
              ? "लोड हो रहा है…"
              : "Loading…"
            : `${filteredCount} ${lang === "hi" ? "एंट्री" : "entries"}${
                totalCount != null ? ` • ${lang === "hi" ? "कुल" : "Total"}: ${totalCount}` : ""
              }`}
        </p>
      </Card>

      <Card title={lang === "hi" ? "सभी एंट्री" : "All Entries"}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted-foreground">
                    {isLoadingEntries
                      ? lang === "hi"
                        ? "लोड हो रहा है…"
                        : "Loading…"
                      : lang === "hi"
                        ? "कोई एंट्री नहीं मिली।"
                        : "No entries found."}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border hover:bg-secondary/40 transition-colors"
                  >
                    <td className="px-4 py-2">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      {entry.customers?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2">{entry.products?.name ?? "—"}</td>
                    <td className="px-4 py-2 capitalize">{entry.shift}</td>
                    <td className="px-4 py-2 text-right">{entry.quantity}</td>
                    <td className="px-4 py-2 text-right">
                      ₹{Number(entry.total_amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default EntriesPage;
