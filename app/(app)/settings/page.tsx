"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { withTimeout } from "@/lib/withTimeout";
import { useI18n } from "@/components/i18n/LanguageProvider";

const FETCH_MS = 18_000;

export default function SettingsPage() {
  const { t, lang } = useI18n();
  const [dairy_name, setDairyName] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [gst, setGst] = useState("");
  const [logo_url, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoadError(null);
      try {
        const res = await withTimeout(
          fetch("/api/dairy-profile", { credentials: "include" }),
          FETCH_MS
        );
        if (res.ok) {
          const row = await res.json();
          if (row) {
            setDairyName(row.dairy_name ?? "");
            setTagline(row.tagline ?? "");
            setAddress(row.address ?? "");
            setPhone(row.phone ?? "");
            setGst(row.gst ?? "");
            setLogoUrl(row.logo_url ?? "");
          }
        } else {
          const j = await res.json().catch(() => ({}));
          setLoadError((j as { error?: string }).error ?? `Could not load profile (${res.status})`);
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Could not load settings");
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/dairy-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        dairy_name,
        tagline,
        address,
        phone,
        gst,
        logo_url,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMessage((j as { error?: string }).error ?? "Save failed");
      return;
    }
    setMessage("Saved.");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-foreground">{t("settings.title")}</h1>
      <p className="text-sm text-muted-foreground">
        These details appear on bills and can be reused across the app.
      </p>
      {loadError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {loadError}
        </p>
      )}
      <Card title={lang === "hi" ? "वर्तमान प्रोफ़ाइल" : "Current profile"}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-2 space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">
                {lang === "hi" ? "डेयरी नाम" : "Dairy name"}
              </p>
              <p className="font-semibold">{dairy_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {lang === "hi" ? "टैगलाइन" : "Tagline"}
              </p>
              <p className="text-sm">{tagline || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {lang === "hi" ? "पता" : "Address"}
              </p>
              <p className="text-sm whitespace-pre-wrap">{address || "—"}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {lang === "hi" ? "फोन" : "Phone"}
                </p>
                <p className="text-sm">{phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {lang === "hi" ? "GST / टैक्स ID" : "GST / Tax ID"}
                </p>
                <p className="text-sm">{gst || "—"}</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-1">
            <p className="text-xs text-muted-foreground mb-1">
              {lang === "hi" ? "लोगो" : "Logo"}
            </p>
            {logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo_url}
                alt="Logo"
                className="w-full max-w-[220px] rounded-md border border-border bg-white object-contain"
              />
            ) : (
              <div className="w-full max-w-[220px] h-[120px] rounded-md border border-border bg-secondary/30 flex items-center justify-center text-xs text-muted-foreground">
                {lang === "hi" ? "कोई लोगो नहीं" : "No logo"}
              </div>
            )}
          </div>
        </div>
      </Card>
      <Card title={lang === "hi" ? "व्यवसाय प्रोफ़ाइल" : "Business profile"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="dairy_name"
            label="Dairy name"
            value={dairy_name}
            onChange={(e) => setDairyName(e.target.value)}
            required
          />
          <Input
            id="tagline"
            label="Tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
          <Input
            id="address"
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            id="phone"
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            id="gst"
            label="GST / Tax ID"
            value={gst}
            onChange={(e) => setGst(e.target.value)}
          />
          <Input
            id="logo_url"
            label="Logo URL (optional)"
            value={logo_url}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
          />
          {message && (
            <p
              className={
                message === "Saved."
                  ? "text-emerald-700 text-sm"
                  : "text-destructive text-sm"
              }
            >
              {message}
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
