"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Phone, Lock, Eye, EyeOff, ArrowRight, RefreshCw, KeyRound, Check } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { StaffUser } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [secret, setSecret] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanPhone = phone.trim();
    const cleanSecret = secret.trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!cleanSecret) {
      setError("Please enter your Master Password or Staff PIN.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{
        access_token: string;
        user: StaffUser;
      }>("/auth/staff/login", {
        method: "POST",
        body: JSON.stringify({
          phone: cleanPhone,
          secret: cleanSecret,
          remember_me: rememberMe,
        }),
      });

      login(data.access_token, data.user);
      
      // Smart redirect: Staff goes directly to POS, Managers/Owners go to Orders
      if (data.user.role === "STAFF") {
        router.push("/take-order");
      } else {
        router.push("/orders");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid mobile number or password/PIN.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (testPhone: string, testSecret: string) => {
    setPhone(testPhone);
    setSecret(testSecret);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 mx-auto flex items-center justify-center font-extrabold text-black text-xl shadow-lg shadow-amber-500/20 mb-4">
            GG
          </div>
          <h1 className="font-extrabold text-xl tracking-tight text-white">
            GULAVLIVAL GRAND
          </h1>
          <p className="text-xs text-amber-500 font-semibold uppercase tracking-widest mt-1">
            Operations Portal
          </p>
          <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>SMS-Free Secure PIN / Password Access</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-start space-x-2">
            <span className="shrink-0 text-red-400 font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Mobile Number
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-xs text-neutral-500 font-bold">
                +91
              </span>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-12 pr-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-neutral-300">
                Password or 4-Digit PIN
              </label>
              <span className="text-[10px] text-neutral-500">Owner: Password • Staff: PIN</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-4 top-3.5" />
              <input
                type={showSecret ? "text" : "password"}
                placeholder="Enter Password or PIN"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-11 pr-11 py-3 text-sm font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors tracking-wide"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-4 top-3.5 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                title={showSecret ? "Hide" : "Show"}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-neutral-400 hover:text-neutral-300 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-md border-neutral-800 bg-neutral-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900"
              />
              <span>Remember This Counter Terminal (30 Days)</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-amber-500/20 active:scale-98 disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </>
            )}
          </button>
        </form>

        {/* Quick Testing Helper */}
        <div className="mt-8 pt-6 border-t border-neutral-800/80">
          <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider text-center mb-2.5">
            Quick Fill Test Accounts (Zero SMS)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("9876543210", "Owner@2026")}
              className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-semibold text-neutral-300 hover:text-amber-400 hover:border-amber-500/40 text-center transition-all cursor-pointer"
            >
              👑 <span className="font-bold">Owner</span>
              <span className="block text-[9px] text-neutral-500">9876543210 / Owner@2026</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("9876543212", "1234")}
              className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-semibold text-neutral-300 hover:text-amber-400 hover:border-amber-500/40 text-center transition-all cursor-pointer"
            >
              🍽️ <span className="font-bold">Staff Counter</span>
              <span className="block text-[9px] text-neutral-500">9876543212 / PIN 1234</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
