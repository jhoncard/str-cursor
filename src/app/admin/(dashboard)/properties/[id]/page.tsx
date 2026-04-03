"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  updateProperty,
  addPropertyImage,
  deletePropertyImage,
  uploadPropertyImageFile,
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
} from "lucide-react";
import Link from "next/link";

type PropertyData = {
  id: string;
  name: string;
  description: string;
  short_description: string;
  base_price_night: number;
  max_guests: number;
  status: string;
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
  const [showAddImage, setShowAddImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");
  const [addingImage, setAddingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    async function load() {
      const [propRes, imgRes] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).single(),
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

      setProperty({
        id: propRes.data.id,
        name: propRes.data.name,
        description: propRes.data.description ?? "",
        short_description: propRes.data.short_description ?? "",
        base_price_night: propRes.data.base_price_night,
        max_guests: propRes.data.max_guests,
        status: propRes.data.status,
      });
      setImages(imgRes.data ?? []);
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
