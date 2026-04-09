"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import BillStatement, { type BillLine } from "@/components/bills/BillStatement";
import { withTimeout } from "@/lib/withTimeout";
import { useI18n } from "@/components/i18n/LanguageProvider";
import Combobox from "@/components/ui/Combobox";

const FETCH_MS = 18_000;

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
}

interface DairyProfile {
  dairy_name: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  gst?: string | null;
}

const BillingPage = () => {
  const { t, lang } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [profile, setProfile] = useState<DairyProfile | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [lines, setLines] = useState<BillLine[]>([]);
  const [totals, setTotals] = useState({
    openingBalance: 0,
    totalSales: 0,
    totalPaid: 0,
    finalBalance: 0,
  });

  useEffect(() => {
    const load = async () => {
      setBootstrapError(null);
      try {
        const { data: cust, error: cErr } = await withTimeout(
          supabaseClient.from("customers").select("id, name, phone"),
          FETCH_MS
        );
        if (cErr) {
          setBootstrapError(cErr.message);
          setCustomers([]);
        } else {
          setCustomers(cust || []);
        }
        const { data: prof, error: pErr } = await withTimeout(
          supabaseClient.from("dairy_profile").select("*").eq("id", 1).maybeSingle(),
          FETCH_MS
        );
        if (pErr) {
          setBootstrapError((prev) => prev ?? pErr.message);
        } else {
          setProfile(prof);
        }
      } catch (e) {
        setBootstrapError(e instanceof Error ? e.message : "Could not load billing data");
      }
    };
    load();
  }, []);

  const customerName = useMemo(
    () => customers.find((c) => c.id === selectedCustomer)?.name ?? "",
    [customers, selectedCustomer]
  );
  const bucketName = process.env.NEXT_PUBLIC_BILLS_BUCKET || "bills";
  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.phone ? `${c.name} (${c.phone})` : c.name,
    keywords: `${c.name} ${c.phone ?? ""}`,
  }));

  const handleGenerateBill = async () => {
    if (!selectedCustomer || !startDate || !endDate) {
      setUiError("Please select a customer and a date range.");
      setUiMessage(null);
      return;
    }
    setLoading(true);
    setShareUrl(null);
    setUiError(null);
    setUiMessage(null);

    const { data: prevEntries } = await supabaseClient
      .from("entries")
      .select("total_amount")
      .eq("customer_id", selectedCustomer)
      .lt("date", startDate);

    const { data: prevTransactions } = await supabaseClient
      .from("transactions")
      .select("amount")
      .eq("customer_id", selectedCustomer)
      .lt("date", startDate);

    const { data: entries } = await supabaseClient
      .from("entries")
      .select("date, shift, quantity, price_per_unit, total_amount, products(name)")
      .eq("customer_id", selectedCustomer)
      .gte("date", startDate)
      .lte("date", endDate);

    const { data: transactions } = await supabaseClient
      .from("transactions")
      .select("date, type, amount, payment_mode, note")
      .eq("customer_id", selectedCustomer)
      .gte("date", startDate)
      .lte("date", endDate);

    const nextLines: BillLine[] = [];

    for (const e of entries || []) {
      const p = e.products as { name?: string } | null;
      const name = p?.name ?? "product";
      nextLines.push({
        date: String(e.date),
        kind: "sale",
        detail: `${e.shift} · ${Number(e.quantity)} ${name} @ ₹${Number(e.price_per_unit).toFixed(2)}`,
        debit: Number(e.total_amount),
        credit: 0,
      });
    }

    for (const t of transactions || []) {
      nextLines.push({
        date: String(t.date),
        kind: String(t.type),
        detail: `${t.payment_mode}${t.note ? ` · ${t.note}` : ""}`,
        debit: 0,
        credit: Number(t.amount),
      });
    }

    nextLines.sort((a, b) => a.date.localeCompare(b.date));

    let totalSales = 0;
    let totalPaid = 0;
    let prevSales = 0;
    let prevPaid = 0;
    for (const e of prevEntries || []) {
      prevSales += Number(e.total_amount || 0);
    }
    for (const t of prevTransactions || []) {
      prevPaid += Number(t.amount || 0);
    }
    for (const e of entries || []) {
      totalSales += Number(e.total_amount || 0);
    }
    for (const t of transactions || []) {
      totalPaid += Number(t.amount || 0);
    }

    const openingBalance = prevSales - prevPaid;
    const finalBalance = openingBalance + totalSales - totalPaid;

    setLines(nextLines);
    setTotals({
      openingBalance,
      totalSales,
      totalPaid,
      finalBalance,
    });
    setUiMessage("Bill generated.");
    setLoading(false);
  };

  const handleSharePdf = async () => {
    if (!selectedCustomer || !startDate || !endDate) return;
    setShareLoading(true);
    setShareUrl(null);
    try {
      const res = await fetch("/api/bills/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_id: selectedCustomer,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setShareUrl(json.signedUrl);
      setUiMessage(`PDF uploaded to bucket "${json.bucket || bucketName}". Share link ready.`);
    } catch (e) {
      setUiError(e instanceof Error ? e.message : "Could not create share link");
    }
    setShareLoading(false);
  };

  const handlePrint = () => window.print();

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setUiMessage("Link copied to clipboard.");
  };
  const handleShareWhatsApp = () => {
    if (!shareUrl) return;
    const text = `Bill for ${customerName} (${periodLabel})\n${shareUrl}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  };

  const periodLabel = startDate && endDate ? `${startDate} → ${endDate}` : "—";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t("billing.title")}</h1>
      {lines.length > 0 && customerName ? (
        <div className="rounded-xl border border-border bg-white/90 px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">
                {lang === "hi" ? "ग्राहक" : "Customer"}
              </p>
              <p className="font-semibold">{customerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {lang === "hi" ? "अवधि" : "Period"}
              </p>
              <p className="text-sm">{periodLabel}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 md:text-right">
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "hi" ? "पहले का बैलेंस" : "Opening"}
                </p>
                <p className="text-sm font-medium">₹{totals.openingBalance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "hi" ? "अंतिम बैलेंस" : "Final"}
                </p>
                <p className="text-sm font-semibold">₹{totals.finalBalance.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {uiError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {uiError}
        </p>
      )}
      {uiMessage && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">
          {uiMessage}
        </p>
      )}
      <Card title={lang === "hi" ? "मानदंड चुनें" : "Select criteria"}>
        {bootstrapError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-4">
            {bootstrapError}
          </p>
        )}
        {customers.length === 0 && !bootstrapError ? (
          <p className="text-muted-foreground py-2">
            No customers yet. Add customers first, then you can generate bills here.
          </p>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end print:hidden">
          <Combobox
            label={lang === "hi" ? "ग्राहक" : "Customer"}
            value={selectedCustomer}
            onChange={setSelectedCustomer}
            options={customerOptions}
            placeholder={lang === "hi" ? "ग्राहक चुनें" : "Select Customer"}
            disabled={customers.length === 0}
            required
          />
          <Input
            label={lang === "hi" ? "शुरू तारीख" : "Start Date"}
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label={lang === "hi" ? "अंतिम तारीख" : "End Date"}
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
          <Button onClick={handleGenerateBill} disabled={loading}>
            {loading ? (lang === "hi" ? "बन रहा है…" : "Generating…") : lang === "hi" ? "बिल बनाएं" : "Generate bill"}
          </Button>
        </div>
      </Card>

      {lines.length > 0 && customerName && (
        <>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              Print
            </Button>
            <Button onClick={handleSharePdf} disabled={shareLoading}>
              {shareLoading ? "Uploading PDF…" : "Upload & get share link"}
            </Button>
            {shareUrl && (
              <Button variant="outline" onClick={handleCopyLink}>
                Copy link
              </Button>
            )}
            {shareUrl && (
              <Button variant="outline" onClick={handleShareWhatsApp}>
                Share on WhatsApp
              </Button>
            )}
          </div>
          {shareUrl && (
            <p className="text-sm text-muted-foreground print:hidden break-all">
              Share link (expires in 7 days): {shareUrl}
            </p>
          )}
          <p className="text-xs text-muted-foreground print:hidden">
            Supabase storage bucket should be private and named "{bucketName}".
          </p>

          <div className="bill-print">
            <BillStatement
              dairyName={profile?.dairy_name ?? "Dairy"}
              tagline={profile?.tagline}
              address={profile?.address}
              phone={profile?.phone}
              gst={profile?.gst}
              customerName={customerName}
              periodLabel={periodLabel}
              lines={lines}
              openingBalance={totals.openingBalance}
              totalSales={totals.totalSales}
              totalPaid={totals.totalPaid}
              finalBalance={totals.finalBalance}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default BillingPage;
