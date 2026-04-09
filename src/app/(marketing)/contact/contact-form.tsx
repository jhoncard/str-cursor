"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import {
  SITE_CONTACT_EMAIL,
  SITE_CONTACT_PHONE_TEL_HREFS,
} from "@/lib/site-contact";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successNote, setSuccessNote] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Capture before any await — React may clear e.currentTarget after the
    // event handler yields, and form.reset() would throw → false "Failed to send".
    const form = e.currentTarget;
    setStatus("sending");
    setErrorMessage("");
    setSuccessNote("");

    const formData = new FormData(form);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      message: formData.get("message") as string,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // Avoid res.json() throwing on empty/HTML bodies (e.g. proxy timeouts after
      // Resend accepted the send) — that previously showed a false "Failed to send"
      // even when the email was delivered.
      const raw = await res.text();
      let json: {
        error?: string;
        hint?: string;
        success?: boolean;
        devEmailSkipped?: boolean;
      } = {};
      if (raw.trim()) {
        try {
          json = JSON.parse(raw) as typeof json;
        } catch {
          // Non-JSON body with 2xx: treat as success (message likely processed).
          if (res.ok) {
            setStatus("success");
            form.reset();
            return;
          }
        }
      }

      if (!res.ok) {
        setStatus("error");
        const parts = [json.error, json.hint].filter(
          (s: unknown): s is string => typeof s === "string" && s.length > 0,
        );
        setErrorMessage(
          parts.length > 0 ? parts.join(" ") : "Something went wrong.",
        );
        return;
      }

      setStatus("success");
      form.reset();
      if (json.devEmailSkipped === true) {
        setSuccessNote(
          "Development mode: RESEND_API_KEY is not set, so no email was sent. Your message was logged in the server terminal. Add a key to .env.local to deliver mail.",
        );
      }
    } catch {
      setStatus("error");
      setErrorMessage("Failed to send message. Please try again.");
    }
  }

  return (
    <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-8">
      <div className="text-center mb-10">
        <p className="text-sm font-medium tracking-widest text-[#2b2b36]/50 uppercase mb-3">
          Get in Touch
        </p>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-[#2b2b36]">
          Contact Us
        </h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 md:p-10 shadow-sm">
          <h2 className="text-xl font-semibold text-[#2b2b36] mb-6">Send Us a Message</h2>

          {status === "success" && (
            <div className="mb-6 space-y-3">
              <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4 text-sm text-green-800">
                Your message has been sent. We will get back to you shortly.
              </div>
              {successNote && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-900">
                  {successNote}
                </div>
              )}
            </div>
          )}

          {status === "error" && errorMessage && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-800">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#2b2b36] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#f4f6f8] text-sm text-[#2b2b36] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36] transition-colors"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#2b2b36] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#f4f6f8] text-sm text-[#2b2b36] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#2b2b36] mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="(555) 000-0000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#f4f6f8] text-sm text-[#2b2b36] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-[#2b2b36] mb-1.5">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                placeholder="How can we help you?"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#f4f6f8] text-sm text-[#2b2b36] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36] transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="px-8 py-3 rounded-full bg-[#2b2b36] text-white text-sm font-medium hover:bg-[#363645] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "sending" ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[#2b2b36] mb-6">Contact Information</h2>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#f4f6f8] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#2b2b36]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#2b2b36]">Email</p>
                  <a
                    href={`mailto:${SITE_CONTACT_EMAIL}`}
                    className="text-sm text-gray-500 hover:text-[#2b2b36] transition-colors"
                  >
                    {SITE_CONTACT_EMAIL}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#f4f6f8] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[#2b2b36]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#2b2b36]">Phone</p>
                  <p className="text-sm text-gray-500">
                    <a
                      href={SITE_CONTACT_PHONE_TEL_HREFS[0]}
                      className="hover:text-[#2b2b36] transition-colors"
                    >
                      (603) 484-9623
                    </a>
                    {" or "}
                    <a
                      href={SITE_CONTACT_PHONE_TEL_HREFS[1]}
                      className="hover:text-[#2b2b36] transition-colors"
                    >
                      (651) 285-6410
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#f4f6f8] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-[#2b2b36]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#2b2b36]">Location</p>
                  <p className="text-sm text-gray-500">Tampa Bay, FL</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#2b2b36] rounded-3xl p-8">
            <h3 className="text-lg font-semibold text-white mb-2">Response Time</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              We typically respond within 1 hour during business hours. For urgent matters
              during your stay, please call us directly.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
