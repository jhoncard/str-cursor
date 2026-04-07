"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  updateProperty,
  addPropertyImage,
  deletePropertyImage,
  uploadPropertyImageFile,
  uploadPropertyRentalAgreementPdf,
  removePropertyRentalAgreementPdf,
  syncPriceLabsRatesForPropertyAction,
  addPropertyIcalFeed,
  deletePropertyIcalFeed,
  syncPropertyIcalFeedNow,
  regeneratePropertyIcalExportToken,
} from "../../../actions";
import {
  Save,
  Trash2,
  Plus,
  X,
  ArrowLeft,
  Loader2,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Upload,
  Calendar,
  Copy,
  RefreshCw,
  Link2,
  FileText,
} from "lucide-react";
import Link from "next/link";

type PropertyData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Public URL of rental agreement PDF (Supabase Storage), or empty. */
  guest_contract_pdf_url: string;
  /** PriceLabs listing ID for dynamic pricing sync. */
  pricelabs_listing_id: string;
  short_description: string;
  base_price_night: number;
  max_guests: number;
  status: string;
  ical_export_token: string;
};

type IcalFeedRow = {
  id: string;
  feed_url: string;
  source: string;
  last_sync_at: string | null;
};

type PropertyImage = {
  id: string;
  url: string;
  alt_text: string;
  sort_order: number;
  is_cover: boolean;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

export default function PropertyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rentalPdfInputRef = useRef<HTMLInputElement>(null);
  const [rentalPdfBusy, setRentalPdfBusy] = useState(false);
  const [priceLabsSyncing, setPriceLabsSyncing] = useState(false);
  const [showAddImage, setShowAddImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");
  const [addingImage, setAddingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [icalFeeds, setIcalFeeds] = useState<IcalFeedRow[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedSource, setNewFeedSource] = useState("airbnb");
  const [icalBusy, setIcalBusy] = useState<string | null>(null);
  const [icalLoadError, setIcalLoadError] = useState<string | null>(null);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  async function reloadIcalFeeds() {
    const { data, error } = await supabase
      .from("property_ical_feeds")
      .select("id, feed_url, source, last_sync_at")
      .eq("property_id", id)
      .order("created_at");
    if (error) {
      setIcalLoadError(error.message);
      showToast("error", `Could not load iCalendars: ${error.message}`);
      return;
    }
    setIcalLoadError(null);
    setIcalFeeds(data ?? []);
  }

  useEffect(() => {
    async function load() {
      const [propRes, imgRes] = await Promise.all([
        supabase
          .from("properties")
          .select(
            "id, slug, name, description, guest_contract_pdf_url, pricelabs_listing_id, short_description, base_price_night, max_guests, status, ical_export_token"
          )
          .eq("id", id)
          .single(),
        supabase
          .from("property_images")
          .select("*")
          .eq("property_id", id)
          .order("sort_order"),
      ]);

      if (propRes.error || !propRes.data) {
        showToast("error", "Property not found");
        setLoading(false);
        return;
      }

      const token =
        typeof propRes.data.ical_export_token === "string"
          ? propRes.data.ical_export_token
          : "";

      setProperty({
        id: propRes.data.id,
        slug: propRes.data.slug,
        name: propRes.data.name,
        description: propRes.data.description ?? "",
        guest_contract_pdf_url:
          typeof propRes.data.guest_contract_pdf_url === "string"
            ? propRes.data.guest_contract_pdf_url
            : "",
        pricelabs_listing_id:
          typeof propRes.data.pricelabs_listing_id === "string"
            ? propRes.data.pricelabs_listing_id
            : "",
        short_description: propRes.data.short_description ?? "",
        base_price_night: propRes.data.base_price_night,
        max_guests: propRes.data.max_guests,
        status: propRes.data.status,
        ical_export_token: token,
      });
      setImages(imgRes.data ?? []);

      const { data: feeds, error: feedsError } = await supabase
        .from("property_ical_feeds")
        .select("id, feed_url, source, last_sync_at")
        .eq("property_id", id)
        .order("created_at");
      if (feedsError) {
        setIcalLoadError(feedsError.message);
        showToast("error", `Could not load iCalendars: ${feedsError.message}`);
      } else {
        setIcalLoadError(null);
      }
      setIcalFeeds(feeds ?? []);
      setLoading(false);
    }
    load();
  }, [id, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!property) return;
    setSaving(true);
    try {
      await updateProperty(property.id, {
        name: property.name,
        description: property.description,
        pricelabs_listing_id: property.pricelabs_listing_id.trim() || null,
        short_description: property.short_description,
        base_price_night: property.base_price_night,
        max_guests: property.max_guests,
        status: property.status,
      });
      showToast("success", "Property saved successfully");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddImage() {
    if (!newImageUrl.trim()) return;
    setAddingImage(true);
    try {
      await addPropertyImage(id, newImageUrl.trim(), newImageAlt.trim());
      const { data } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", id)
        .order("sort_order");
      setImages(data ?? []);
      setNewImageUrl("");
      setNewImageAlt("");
      setShowAddImage(false);
      showToast("success", "Image added");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed to add image");
    } finally {
      setAddingImage(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    try {
      await deletePropertyImage(imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      showToast("success", "Image deleted");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed to delete image");
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("propertyId", id);
      fd.append("altText", newImageAlt.trim());
      await uploadPropertyImageFile(fd);
      const { data } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", id)
        .order("sort_order");
      setImages(data ?? []);
      showToast("success", "Image uploaded");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Upload failed"
      );
    } finally {
      setUploadingFile(false);
    }
  }

  function updateField<K extends keyof PropertyData>(
    key: K,
    value: PropertyData[K]
  ) {
    setProperty((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  const exportIcsAbsoluteUrl =
    typeof window !== "undefined" && property?.ical_export_token
      ? `${window.location.origin}/api/ical/export/${property.ical_export_token}/calendar.ics`
      : process.env.NEXT_PUBLIC_APP_URL && property?.ical_export_token
        ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/ical/export/${property.ical_export_token}/calendar.ics`
        : "";

  async function handleCopyExportUrl() {
    const url = exportIcsAbsoluteUrl;
    if (!url) {
      showToast("error", "Set NEXT_PUBLIC_APP_URL for a full link, or copy from a deployed site.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("success", "Calendar link copied — paste into Airbnb or VRBO (iCal / sync).");
    } catch {
      showToast("error", "Could not copy. Copy the link manually.");
    }
  }

  async function handleRegenerateExportToken() {
    if (!property) return;
    if (!confirm("Regenerate the export link? You must update Airbnb/VRBO with the new URL.")) return;
    setIcalBusy("regen");
    try {
      const { icalExportToken } = await regeneratePropertyIcalExportToken(property.id);
      setProperty((p) => (p ? { ...p, ical_export_token: icalExportToken } : p));
      showToast("success", "New export link generated.");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setIcalBusy(null);
    }
  }

  async function handleAddIcalFeed() {
    if (!property || !newFeedUrl.trim()) return;
    setIcalBusy("add");
    try {
      await addPropertyIcalFeed(property.id, newFeedUrl.trim(), newFeedSource);
      setNewFeedUrl("");
      await reloadIcalFeeds();
      showToast("success", "Calendar added and synced.");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed to add feed");
    } finally {
      setIcalBusy(null);
    }
  }

  async function handleDeleteFeed(feedId: string) {
    if (!confirm("Remove this imported calendar? Blocked nights from it will be cleared.")) return;
    setIcalBusy(feedId);
    try {
      await deletePropertyIcalFeed(feedId);
      await reloadIcalFeeds();
      showToast("success", "Calendar removed.");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setIcalBusy(null);
    }
  }

  async function handleSyncFeed(feedId: string) {
    setIcalBusy(feedId);
    try {
      const { nightsBlocked } = await syncPropertyIcalFeedNow(feedId);
      await reloadIcalFeeds();
      showToast("success", `Synced — ${nightsBlocked} blocked night(s) from this feed.`);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Sync failed");
    } finally {
      setIcalBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#2b2b36]/40">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-24">
        <p className="text-[#2b2b36]/40 mb-4">Property not found</p>
        <Link
          href="/admin/properties"
          className="text-sm font-medium text-[#2b2b36] underline underline-offset-4"
        >
          Back to properties
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/admin/properties")}
          className="p-2 rounded-xl hover:bg-white transition-colors text-[#2b2b36]/40 hover:text-[#2b2b36]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36] tracking-tight">
          Edit Property
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#2b2b36]/60 mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={property.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[#2b2b36] text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2b2b36]/60 mb-1.5">
                Short Description
              </label>
              <input
                type="text"
                value={property.short_description}
                onChange={(e) =>
                  updateField("short_description", e.target.value)
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[#2b2b36] text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2b2b36]/60 mb-1.5">
                Description
              </label>
              <textarea
                value={property.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={8}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[#2b2b36] text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36]/30 transition-all resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2b2b36]/60 mb-1.5">
                Rental agreement (PDF)
              </label>
              <p className="text-xs text-[#2b2b36]/45 mb-3">
                Guests see this PDF on the booking page and must accept it before paying.
                Leave unset if this listing does not need a property-specific agreement
                (guests still accept house rules and site policies). Max 15MB.
              </p>
              {property.guest_contract_pdf_url ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 p-3 rounded-xl border border-gray-200 bg-gray-50/80">
                  <FileText className="w-5 h-5 text-[#2b2b36] shrink-0" />
                  <a
                    href={property.guest_contract_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#2b2b36] font-medium underline truncate flex-1 min-w-0"
                  >
                    View current PDF
                  </a>
                  <button
                    type="button"
                    disabled={rentalPdfBusy}
                    onClick={async () => {
                      if (!property || !confirm("Remove the rental agreement PDF?")) return;
                      setRentalPdfBusy(true);
                      try {
                        await removePropertyRentalAgreementPdf(property.id);
                        setProperty((p) =>
                          p ? { ...p, guest_contract_pdf_url: "" } : p
                        );
                        showToast("success", "Rental agreement removed");
                      } catch (e) {
                        showToast(
                          "error",
                          e instanceof Error ? e.message : "Failed to remove"
                        );
                      } finally {
                        setRentalPdfBusy(false);
                      }
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium shrink-0 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#2b2b36]/45 mb-3">No PDF uploaded.</p>
              )}
              <input
                ref={rentalPdfInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !property) return;
                  setRentalPdfBusy(true);
                  try {
                    const fd = new FormData();
                    fd.append("propertyId", property.id);
                    fd.append("file", file);
                    const result = await uploadPropertyRentalAgreementPdf(fd);
                    if ("url" in result && typeof result.url === "string") {
                      setProperty((p) =>
                        p ? { ...p, guest_contract_pdf_url: result.url } : p
                      );
                    }
                    showToast("success", "Rental agreement PDF uploaded");
                  } catch (err) {
                    showToast(
                      "error",
                      err instanceof Error ? err.message : "Upload failed"
                    );
                  } finally {
                    setRentalPdfBusy(false);
                  }
                }}
              />
              <button
                type="button"
                disabled={rentalPdfBusy}
                onClick={() => rentalPdfInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-[#2b2b36] hover:bg-gray-50 disabled:opacity-50"
              >
                {rentalPdfBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {property.guest_contract_pdf_url ? "Replace PDF" : "Upload PDF"}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2b2b36]/60 mb-1.5">
                PriceLabs dynamic pricing
              </label>
              <p className="text-xs text-[#2b2b36]/45 mb-2">
                Paste the listing ID from your PriceLabs dashboard. Server env needs{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">PRICELABS_API_KEY</code>
                {" "}(Customer API uses{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">POST /v1/listing_prices</code>
                ). Optional:{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">PRICELABS_PMS</code>{" "}
                (default airbnb) if your PMS name differs. See .env.example. Save, then sync.
              </p>
              <input
                type="text"
                value={property.pricelabs_listing_id}
                onChange={(e) => updateField("pricelabs_listing_id", e.target.value)}
                placeholder="Numeric listing ID (e.g. 661775…), not your API key"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[#2b2b36] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36]/30 transition-all mb-3"
              />
              <button
                type="button"
                disabled={priceLabsSyncing || !property.pricelabs_listing_id.trim()}
                onClick={async () => {
                  if (!property?.pricelabs_listing_id.trim()) {
                    showToast("error", "Enter a PriceLabs listing ID.");
                    return;
                  }
                  setPriceLabsSyncing(true);
                  try {
                    await updateProperty(property.id, {
                      pricelabs_listing_id: property.pricelabs_listing_id.trim(),
                    });
                    const result = await syncPriceLabsRatesForPropertyAction(property.id);
                    if (result.ok) {
                      showToast(
                        "success",
                        `Synced ${result.nightsUpdated} night price(s) from PriceLabs.`
                      );
                    } else {
                      showToast("error", result.message ?? "Sync failed.");
                    }
                  } catch (e) {
                    showToast(
                      "error",
                      e instanceof Error ? e.message : "Sync failed."
                    );
                  } finally {
                    setPriceLabsSyncing(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-[#2b2b36] hover:bg-gray-50 disabled:opacity-50"
              >
                {priceLabsSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync rates now
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-gray-50 text-[#2b2b36]">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-[#2b2b36]">
                  iCalendar sync
                </h2>
                <p className="text-sm text-[#2b2b36]/50 mt-1">
                  Import busy nights from Airbnb, VRBO, or any iCal URL. Updates run
                  automatically every 15 minutes when{" "}
                  <code className="text-xs bg-gray-100 px-1 rounded">CRON_SECRET</code>{" "}
                  Authorization is configured on Vercel. Guests cannot book blocked
                  nights.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[#2b2b36]">
                <Link2 className="w-4 h-4" />
                Export for Airbnb / VRBO
              </div>
              <p className="text-xs text-[#2b2b36]/55">
                Paste this URL into the other platform so they pull{" "}
                <strong>direct bookings</strong> from this site and close those dates
                there.
              </p>
              {property.ical_export_token ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      readOnly
                      value={exportIcsAbsoluteUrl || "/api/ical/export/…/calendar.ics"}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-mono text-[#2b2b36]/80"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopyExportUrl}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-[#2b2b36] text-white hover:bg-[#2b2b36]/90"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      <button
                        type="button"
                        disabled={icalBusy === "regen"}
                        onClick={handleRegenerateExportToken}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white text-[#2b2b36] hover:bg-gray-50 disabled:opacity-50"
                      >
                        {icalBusy === "regen" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        New link
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#2b2b36]">Import calendars</p>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-[#2b2b36]/70">
                  Added: {icalFeeds.length}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://…/calendar.ics"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[#2b2b36] text-sm bg-white"
                />
                <select
                  value={newFeedSource}
                  onChange={(e) => setNewFeedSource(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-[#2b2b36] text-sm bg-white"
                >
                  <option value="airbnb">Airbnb</option>
                  <option value="vrbo">VRBO</option>
                  <option value="booking_com">Booking.com</option>
                  <option value="other">Other</option>
                </select>
                <button
                  type="button"
                  disabled={icalBusy === "add" || !newFeedUrl.trim()}
                  onClick={handleAddIcalFeed}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[#2b2b36] text-white hover:bg-[#2b2b36]/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {icalBusy === "add" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add
                </button>
              </div>
              {icalLoadError ? (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  Could not load existing iCalendars: {icalLoadError}
                </p>
              ) : null}

              {icalFeeds.length === 0 ? (
                <p className="text-sm text-[#2b2b36]/40 py-4 text-center border border-dashed border-gray-200 rounded-xl">
                  No imported calendars yet.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {icalFeeds.map((f) => (
                    <li
                      key={f.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#2b2b36] capitalize">
                          {f.source.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-[#2b2b36]/50 truncate font-mono">
                          {f.feed_url}
                        </p>
                        <p className="text-[10px] text-[#2b2b36]/40 mt-0.5">
                          Last sync:{" "}
                          {f.last_sync_at
                            ? new Date(f.last_sync_at).toLocaleString()
                            : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={icalBusy === f.id}
                          onClick={() => handleSyncFeed(f.id)}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-[#2b2b36] disabled:opacity-50"
                          title="Sync now"
                        >
                          {icalBusy === f.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFeed(f.id)}
                          className="p-2 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelected}
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h2 className="text-lg font-semibold text-[#2b2b36]">Images</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={uploadingFile}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white text-[#2b2b36] hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {uploadingFile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload from computer
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddImage(!showAddImage)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-[#2b2b36] text-white hover:bg-[#2b2b36]/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add image URL
                </button>
              </div>
            </div>

            {showAddImage && (
              <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <p className="text-xs text-[#2b2b36]/50">
                  Optional alt text below also applies to the next upload from your computer.
                </p>
                <input
                  type="url"
                  placeholder="Image URL"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[#2b2b36] text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36]/30 transition-all bg-white"
                />
                <input
                  type="text"
                  placeholder="Alt text (optional)"
                  value={newImageAlt}
                  onChange={(e) => setNewImageAlt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[#2b2b36] text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36]/30 transition-all bg-white"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddImage}
                    disabled={addingImage || uploadingFile || !newImageUrl.trim()}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-[#2b2b36] text-white hover:bg-[#2b2b36]/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {addingImage && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowAddImage(false);
                      setNewImageUrl("");
                      setNewImageAlt("");
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-[#2b2b36]/60 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#2b2b36]/30">
                <ImageIcon className="w-10 h-10 mb-3" />
                <p className="text-sm">No images yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="group relative bg-gray-100 rounded-xl overflow-hidden aspect-[4/3]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt_text || "Property image"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {img.is_cover && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-semibold text-[#2b2b36] uppercase tracking-wider">
                        Cover
                      </span>
                    )}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-white/90 text-[10px] text-[#2b2b36]/60">
                      #{img.sort_order}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#2b2b36]/60 mb-1.5">
                Base Price / Night
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2b2b36]/40 text-sm">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={property.base_price_night}
                  onChange={(e) =>
                    updateField("base_price_night", Number(e.target.value))
                  }
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-[#2b2b36] text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36]/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2b2b36]/60 mb-1.5">
                Max Guests
              </label>
              <input
                type="number"
                min={1}
                value={property.max_guests}
                onChange={(e) =>
                  updateField("max_guests", Number(e.target.value))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[#2b2b36] text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2b2b36]/60 mb-1.5">
                Status
              </label>
              <select
                value={property.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[#2b2b36] text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36]/30 transition-all bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2b2b36] text-white font-medium hover:bg-[#2b2b36]/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
