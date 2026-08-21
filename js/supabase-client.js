/* =========================================================
   EARNRUSH — SUPABASE CLIENT BOOTSTRAP
   -----------------------------------------------------------
   Standard, documented Supabase JS client initialization only.
   Uses the publishable/anon key — safe for frontend use. NEVER
   put a service-role/secret key in this file or anywhere in the
   frontend; all privileged operations (admin actions, coin
   deduction on withdrawal, etc.) must happen through the existing
   database functions (create_withdrawal, admin_update_withdrawal,
   etc.) running under RLS + SECURITY DEFINER on Supabase's side,
   not through a client-held admin key.

   Requires the Supabase JS UMD build to be loaded first — see the
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js">
   tag added in index.html, right before this file.
   ========================================================= */

(() => {
  "use strict";

  if (window.__earnRushSupabaseLoaded) return;
  window.__earnRushSupabaseLoaded = true;

  const SUPABASE_URL = "https://zytirayspgejcbyrzzya.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_pulMNUWJ98xLR_DkIjkFAg_ZzcQnAhC";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error(
      "[EarnRush] Supabase JS library not found. Make sure the CDN " +
      "<script> tag for @supabase/supabase-js loads BEFORE js/supabase-client.js."
    );
    return;
  }

  // window.supabase (the library namespace) gets shadowed here by the
  // actual client instance, matching the common Supabase-JS convention.
  window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
})();
