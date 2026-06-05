"use server";

import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/constants";

/** Registra el consentimiento informado del paciente para la versión vigente. */
export async function recordConsent(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.from("consents").insert({
    patient_id: user.id,
    version: CONSENT_VERSION,
  });

  return { ok: !error };
}
