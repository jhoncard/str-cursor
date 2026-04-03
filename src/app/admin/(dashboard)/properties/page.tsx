import { requireAdminPage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Building2, ImageIcon } from "lucide-react";
import Link from "next/link";

const statusColor: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-gray-100 text-gray-600 border-gray-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
};

export default async function PropertiesPage() {
  await requireAdminPage();
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("*, property_images(id)")
    .order("name");

  const rows = (properties ?? []) as Array<{
    id: string;
    name: string;
    slug: string;
    property_type: string;
    status: string;
    base_price_night: number;
    property_images: { id: string }[];
  }>;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36] tracking-tight mb-6">
        Properties
      </h1>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-[#2b2b36]/40">
          No properties found
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <Link
              key={p.id}
              href={`/admin/properties/${p.id}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-[#2b2b36]/5 group-hover:bg-[#2b2b36]/10 transition-colors">
                  <Building2 className="w-5 h-5 text-[#2b2b36]" />
                </div>
                <span
                  className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${
                    statusColor[p.status] ??
                    "bg-gray-100 text-gray-600 border-gray-200"
                  }`}
                >
                  {p.status}
                </span>
              </div>

              <h3 className="font-semibold text-[#2b2b36] text-lg mb-1 leading-snug">
                {p.name}
              </h3>
              <p className="text-sm text-[#2b2b36]/50 capitalize mb-4">
                {p.property_type}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-lg font-bold text-[#2b2b36]">
                  ${p.base_price_night}
                  <span className="text-sm font-normal text-[#2b2b36]/40">
                    /night
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-sm text-[#2b2b36]/40">
                  <ImageIcon className="w-4 h-4" />
                  {p.property_images.length}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
