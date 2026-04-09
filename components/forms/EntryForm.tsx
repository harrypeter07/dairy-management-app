import React, { useState, useEffect } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useI18n } from "@/components/i18n/LanguageProvider";

type EntryFormProps = {
  customers: { id: string; name: string }[];
  products: { id: number; name: string; default_rate?: number; rate?: number }[];
  entry?: Record<string, unknown> | null;
  onSuccess: () => void;
};

const EntryForm = ({
  customers,
  products,
  entry = null,
  onSuccess,
}: EntryFormProps) => {
  const { t, lang } = useI18n();
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState("morning");
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const cid = entry?.customer_id;
    setCustomerId(
      typeof cid === "string" ? cid : ""
    );
    const pid = entry?.product_id;
    setProductId(pid != null ? String(pid) : "");
    const d = entry?.date;
    setDate(typeof d === "string" ? d : new Date().toISOString().slice(0, 10));
    const sh = entry?.shift;
    setShift(typeof sh === "string" ? sh : "morning");
    const q = entry?.quantity;
    setQuantity(q != null ? String(q) : "");
    const ppu = entry?.price_per_unit;
    setPricePerUnit(ppu != null ? String(ppu) : "");
    setPriceTouched(!!entry); // editing: treat as touched so product change won't overwrite
  }, [entry, customers]);

  useEffect(() => {
    if (!entry) {
      // Only auto-fill if user hasn't edited price yet and the field is empty
      if (priceTouched) return;
      if (pricePerUnit.trim() !== "") return;
      const selectedProduct = products.find((p) => p.id.toString() === productId);
      if (!selectedProduct) return;
      const rate = selectedProduct.default_rate ?? selectedProduct.rate;
      if (rate == null) return;
      setPricePerUnit(String(rate));
    }
  }, [productId, products, entry, priceTouched, pricePerUnit]);

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const trimmedCustomerId = customerId.trim();
      const numericProductId = Number(productId);
      const numericQuantity = Number(quantity);
      const numericPrice = Number(pricePerUnit);

      if (!isUuid(trimmedCustomerId)) {
        setError("Please select a valid customer.");
        return;
      }
      if (!Number.isFinite(numericProductId) || numericProductId <= 0) {
        setError("Please select a valid product.");
        return;
      }
      if (!date) {
        setError("Please select a date.");
        return;
      }
      if (!shift) {
        setError("Please select a shift.");
        return;
      }
      if (!Number.isFinite(numericQuantity)) {
        setError("Please enter a valid quantity.");
        return;
      }
      if (numericQuantity <= 0) {
        setError("Quantity must be greater than 0.");
        return;
      }
      if (!Number.isFinite(numericPrice)) {
        setError("Please enter a valid price.");
        return;
      }
      if (numericPrice <= 0) {
        setError("Price must be greater than 0.");
        return;
      }

      const payload = {
        customer_id: trimmedCustomerId,
        product_id: numericProductId,
        date,
        shift,
        quantity: numericQuantity,
        price_per_unit: numericPrice,
      };

      console.log("[EntryForm] saving entry", {
        mode: entry ? "update" : "create",
        payload: {
          ...payload,
          customer_id: `${payload.customer_id.slice(0, 8)}…`,
        },
      });

      const res = await fetch("/api/entries", {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          entry
            ? {
                id: typeof (entry as any).id === "string" ? (entry as any).id : undefined,
                ...payload,
              }
            : payload
        ),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[EntryForm] save failed", { status: res.status, json });
        setError(json?.error || "Failed to save entry");
        return;
      }

      setSuccess(entry ? "Entry updated." : "Entry added.");
      if (!entry) {
        setQuantity("");
        setSuccess("Entry added. You can add another.");
      }
      onSuccess();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to save entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label={t("form.customer")}
        value={customerId}
        onChange={setCustomerId}
        options={customers.map((c) => ({ value: c.id, label: c.name }))}
        placeholder={lang === "hi" ? "ग्राहक चुनें" : "Select customer"}
        required
        disabled={!!entry}
      />
      <Select
        label={t("form.product")}
        value={productId}
        onChange={setProductId}
        options={products.map((p) => ({
          value: p.id.toString(),
          label: p.name,
        }))}
        placeholder={lang === "hi" ? "उत्पाद चुनें" : "Select product"}
        required
      />
      <Input
        id="entry-qty"
        label={t("form.quantity")}
        type="number"
        step="0.1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        required
      />
      <Input
        id="entry-price"
        label={t("form.pricePerUnit")}
        type="number"
        step="0.01"
        value={pricePerUnit}
        onChange={(e) => {
          setPriceTouched(true);
          setPricePerUnit(e.target.value);
        }}
        required
      />
      <Input
        id="entry-date"
        label={t("form.date")}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <Select
        label={t("form.shift")}
        value={shift}
        onChange={setShift}
        options={[
          { value: "morning", label: t("form.morning") },
          { value: "evening", label: t("form.evening") },
        ]}
        required
      />
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.saving") : lang === "hi" ? "एंट्री सेव करें" : "Save Entry"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">
          {success}
        </p>
      )}
    </form>
  );
};

export default EntryForm;
