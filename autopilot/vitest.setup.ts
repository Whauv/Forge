// Default test env vars so modules that validate env at import time
// (e.g. @/lib/env, @/lib/supabase) load in local runs. CI sets real values;
// setUnset only fills gaps so it never overrides them.
function setUnset(key: string, value: string) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

setUnset("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
setUnset("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
setUnset("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
setUnset("RESEND_API_KEY", "test-resend-key");
setUnset("RESEND_FROM_EMAIL", "test@example.com");
setUnset("FORGE_BACKEND_URL", "http://127.0.0.1:8000");

// Registers jest-dom matchers (toBeInTheDocument, etc.) for all suites.
// Safe to load in the node environment too — it only extends `expect`.
// React Testing Library auto-cleans up after each test via vitest's global
// afterEach (globals: true), so no manual cleanup is needed here.
import "@testing-library/jest-dom/vitest";
