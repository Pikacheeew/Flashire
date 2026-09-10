// Browser Supabase client. Uses the public anon key (RLS-limited) — safe to ship to the client.
"use client";
import { createClient } from "@supabase/supabase-js";

export function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

let client;
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase isn't configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}
