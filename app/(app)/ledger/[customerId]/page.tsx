"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import TransactionForm from "@/components/forms/TransactionForm";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { withTimeout } from "@/lib/withTimeout";
import { useI18n } from "@/components/i18n/LanguageProvider";

const FETCH_MS = 18_000;
import EntryForm from "@/components/forms/EntryForm";

interface LedgerItem {
  id: string;
  type: "entry" | "transaction";
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  original_item: Record<string, unknown>;
}

const LedgerPage = () => {
  const { t, lang } = useI18n();
  const params = useParams();
  const customerId = params.customerId as string;

  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(
    null
  );
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalPaid: 0,
    finalBalance: 0,
    openingBalance: 0,
    periodSales: 0,
    periodPaid: 0,
    periodNetChange: 0,
    periodClosingBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Record<string, unknown> | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<
    { id: number; name: string; default_rate: number }[]
  >([]);

  const fetchLedgerData = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setActionError(null);

    try {
      const { data: customerData, error: custErr } = await withTimeout(
        supabaseClient.from("customers").select("id, name").eq("id", customerId).maybeSingle(),
        FETCH_MS
      );

      if (custErr || !customerData) {
        setCustomer(null);
        setLedgerItems([]);
        setProducts([]);
        setSummary({
          totalSales: 0,
          totalPaid: 0,
          finalBalance: 0,
          openingBalance: 0,
          periodSales: 0,
          periodPaid: 0,
          periodNetChange: 0,
          periodClosingBalance: 0,
        });
        return;
      }

      setCustomer(customerData);

      const { data: productsData, error: prodErr } = await withTimeout(
        supabaseClient.from("products").select("*"),
        FETCH_MS
      );
      if (prodErr) {
        setActionError(prodErr.message);
        setProducts([]);
      } else {
        setProducts(productsData || []);
      }

      const { data: entries, error: entErr } = await withTimeout(
        supabaseClient
          .from("entries")
          .select("*, products(name)")
          .eq("customer_id", customerId),
        FETCH_MS
      );
      const { data: transactions, error: txErr } = await withTimeout(
        supabaseClient.from("transactions").select("*").eq("customer_id", customerId),
        FETCH_MS
      );

      if (entErr || txErr) {
        setActionError(entErr?.message ?? txErr?.message ?? "Could not load ledger");
        setLedgerItems([]);
        setSummary({
          totalSales: 0,
          totalPaid: 0,
          finalBalance: 0,
          openingBalance: 0,
          periodSales: 0,
          periodPaid: 0,
          periodNetChange: 0,
          periodClosingBalance: 0,
        });
        return;
      }

    type EntryRow = {
      id: string;
      date: string;
      quantity: number;
      price_per_unit: number;
      total_amount: number;
      products: { name: string } | null;
    };
    type TxRow = {
      id: string;
      date: string;
      type: string;
      amount: number;
    };

    const combined = [
      ...(entries || []).map((e: EntryRow) => ({
        id: e.id,
        type: "entry" as const,
        date: e.date,
        description: `${e.quantity} ${e.products?.name ?? "product"} @ ₹${Number(e.price_per_unit).toFixed(2)}`,
        debit: Number(e.total_amount),
        credit: 0,
        original_item: e as unknown as Record<string, unknown>,
      })),
      ...(transactions || []).map((t: TxRow) => ({
        id: t.id,
        type: "transaction" as const,
        date: t.date,
        description:
          t.type === "advance"
            ? "Advance"
            : t.type === "adjustment"
              ? "Adjustment"
              : "Payment",
        debit: 0,
        credit: Number(t.amount),
        original_item: t as unknown as Record<string, unknown>,
      })),
    ].sort((a, b) => {
      const ta = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (ta !== 0) return ta;
      if (a.type !== b.type) return a.type === "entry" ? -1 : 1;
      return a.id.localeCompare(b.id);
    });

    let runningBalance = 0;
    const processedItems = combined.map((item) => {
      runningBalance += item.debit - item.credit;
      return { ...item, balance: runningBalance };
    });

    const totalSales = processedItems.reduce((sum, item) => sum + item.debit, 0);
    const totalPaid = processedItems.reduce((sum, item) => sum + item.credit, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    let openingBalance = 0;
    let periodSales = 0;
    let periodPaid = 0;
    for (const item of processedItems) {
      const itemDate = new Date(item.date);
      if (itemDate < startOfMonth) {
        openingBalance += item.debit - item.credit;
      } else {
        periodSales += item.debit;
        periodPaid += item.credit;
      }
    }
    const periodNetChange = periodSales - periodPaid;
    const periodClosingBalance = openingBalance + periodNetChange;

      setLedgerItems(processedItems);
      setSummary({
        totalSales,
        totalPaid,
        finalBalance: runningBalance,
        openingBalance,
        periodSales,
        periodPaid,
        periodNetChange,
        periodClosingBalance,
      });
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : "Failed to load ledger");
      setLedgerItems([]);
      setSummary({
        totalSales: 0,
        totalPaid: 0,
        finalBalance: 0,
        openingBalance: 0,
        periodSales: 0,
        periodPaid: 0,
        periodNetChange: 0,
        periodClosingBalance: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  const handleSuccess = () => {
    setIsPaymentModalOpen(false);
    setIsEntryModalOpen(false);
    fetchLedgerData();
  };

  const openEditEntryModal = (entry: Record<string, unknown>) => {
    setEditingEntry(entry);
    setIsEntryModalOpen(true);
  };

  const handleDelete = async (item: LedgerItem) => {
    const tableName = item.type === "entry" ? "entries" : "transactions";
    if (confirm(`Are you sure you want to delete this ${item.type}?`)) {
      const { error } = await supabaseClient.from(tableName).delete().eq("id", item.id);
      if (error) {
        setActionError(error.message);
        setActionMessage(null);
      } else {
        setActionMessage(`${item.type === "entry" ? "Entry" : "Transaction"} deleted.`);
        setActionError(null);
        fetchLedgerData();
      }
    }
  };

  if (!loading && !customer) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-destructive font-medium">Customer not found.</p>
        <p className="text-sm text-muted-foreground">
          Check the link or add the customer from the Customers page.
        </p>
      </div>
    );
  }

  if (!customer) {
    return <div className="p-6 min-h-[40vh]" aria-busy="true" />;
  }

  return (
    <div className="space-y-6">
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={lang === "hi" ? "भुगतान / एडवांस जोड़ें" : "Add Payment / Advance"}
      >
        <TransactionForm
          customerId={customerId}
          onSuccess={handleSuccess}
          defaultType={summary.finalBalance > 0 ? "payment" : "advance"}
        />
      </Modal>
      <Modal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title={lang === "hi" ? "एंट्री संपादित करें" : "Edit Entry"}
      >
        <EntryForm
          customers={[customer]}
          products={products}
          entry={editingEntry}
          onSuccess={handleSuccess}
        />
      </Modal>

      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-foreground">Ledger for {customer.name}</h1>
        <Button type="button" onClick={() => setIsPaymentModalOpen(true)}>
          {t("ledger.addPayment")}
        </Button>
      </div>
      {actionError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {actionError}
        </p>
      )}
      {actionMessage && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">
          {actionMessage}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Previous Balance">
          <p
            className={`text-2xl font-semibold ${
              summary.openingBalance > 0 ? "text-destructive" : "text-emerald-700"
            }`}
          >
            ₹{Math.abs(summary.openingBalance).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Before this month
          </p>
        </Card>
        <Card title="This Month Sales">
          <p className="text-2xl font-semibold">₹{summary.periodSales.toFixed(2)}</p>
        </Card>
        <Card title="This Month Paid/Advance">
          <p className="text-2xl font-semibold text-emerald-700">
            ₹{summary.periodPaid.toFixed(2)}
          </p>
        </Card>
        <Card title="Net Payable (This Month)">
          <p
            className={`text-2xl font-semibold ${
              summary.periodClosingBalance > 0 ? "text-destructive" : "text-emerald-700"
            }`}
          >
            ₹{Math.abs(summary.periodClosingBalance).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "hi"
              ? "पिछला बैलेंस + इस महीने की बिक्री - भुगतान"
              : "Previous balance + this month sales - paid"}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Total Sales (All Time)">
          <p className="text-2xl font-semibold">₹{summary.totalSales.toFixed(2)}</p>
        </Card>
        <Card title="Total Paid (All Time)">
          <p className="text-2xl font-semibold text-emerald-700">
            ₹{summary.totalPaid.toFixed(2)}
          </p>
        </Card>
        <Card title="Final Balance (All Time)">
          <p
            className={`text-2xl font-semibold ${
              summary.finalBalance > 0 ? "text-destructive" : "text-emerald-700"
            }`}
          >
            ₹{Math.abs(summary.finalBalance).toFixed(2)}
          </p>
        </Card>
      </div>

      <Card title="Transaction History">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Debit (Sale)</th>
              <th className="px-4 py-3 text-right">Credit (Paid)</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ledgerItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No entries or payments yet for this customer.
                </td>
              </tr>
            ) : null}
            {ledgerItems.map((item) => (
              <tr key={item.id} className="border-b border-border hover:bg-secondary/40">
                <td className="px-4 py-2">
                  {new Date(item.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">{item.description}</td>
                <td className="px-4 py-2 text-right text-destructive/90">
                  {item.debit > 0 ? `₹${item.debit.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-2 text-right text-emerald-700">
                  {item.credit > 0 ? `₹${item.credit.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-2 text-right font-medium">
                  ₹{item.balance.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex justify-center gap-2 flex-wrap">
                    {item.type === "entry" && (
                      <Button
                        variant="outline"
                        className="px-2 py-1 text-xs"
                        onClick={() => openEditEntryModal(item.original_item)}
                      >
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      className="px-2 py-1 text-xs"
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default LedgerPage;
