"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { updateBookingTimeOverrides } from "@/app/admin/actions";

type Props = {
  bookingId: string;
  propertyCheckInTime: string;
  propertyCheckOutTime: string;
  initialCheckInOverride: string;
  initialCheckOutOverride: string;
};

export function EditReservationForm({
  bookingId,
  propertyCheckInTime,
  propertyCheckOutTime,
  initialCheckInOverride,
  initialCheckOutOverride,
}: Props) {
  const router = useRouter();
  const [checkInOverride, setCheckInOverride] = useState(initialCheckInOverride);
  const [checkOutOverride, setCheckOutOverride] = useState(initialCheckOutOverride);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "ok"; doorCode: string | null; lockUpdateFailed: boolean }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function handleSave() {
    setSaving(true);
    setResult({ kind: "idle" });
    try {
      const res = await updateBookingTimeOverrides(bookingId, {
        checkInTimeOverride: checkInOverride,
        checkOutTimeOverride: checkOutOverride,
      });
      setResult({
        kind: "ok",
        doorCode: res.doorCode,
        lockUpdateFailed: res.lockUpdateFailed,
      });
      router.refresh();
    } catch (e) {
      setResult({
        kind: "error",
        message: e instanceof Error ? e.message : "Failed to save.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#2b2b36] mb-1">
          Check-in / check-out overrides
        </h2>
        <p className="text-sm text-gray-500">
          Override the property default for this reservation only. Leave blank
          to use the property default. The smart lock access window will
          update automatically (±1 hour).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-[#2b2b36] mb-1">
            Check-in time override
          </span>
          <input
            type="time"
            value={checkInOverride}
            onChange={(e) => setCheckInOverride(e.target.value)}
            placeholder={propertyCheckInTime}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20"
          />
          <span className="block text-xs text-gray-400 mt-1">
            Property default: {propertyCheckInTime}
          </span>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-[#2b2b36] mb-1">
            Check-out time override
          </span>
          <input
            type="time"
            value={checkOutOverride}
            onChange={(e) => setCheckOutOverride(e.target.value)}
            placeholder={propertyCheckOutTime}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20"
          />
          <span className="block text-xs text-gray-400 mt-1">
            Property default: {propertyCheckOutTime}
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2b2b36] text-white text-sm font-medium hover:bg-[#414152] disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving & updating lock…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save and update smart lock
            </>
          )}
        </button>

        {result.kind === "ok" && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">
                Saved. Door code: {result.doorCode ?? "(not provisioned)"}
              </p>
              {result.lockUpdateFailed && (
                <p className="text-xs mt-1 text-emerald-700">
                  Lock update failed — see admin logs.
                </p>
              )}
            </div>
          </div>
        )}

        {result.kind === "error" && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{result.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
