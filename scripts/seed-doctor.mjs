// Crea (o reactiva) la cuenta del psicólogo de la demo.
//
// Uso (Node 20.9+):
//   node --env-file=.env.local scripts/seed-doctor.mjs
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   SEED_DOCTOR_EMAIL, SEED_DOCTOR_PASSWORD, SEED_DOCTOR_NAME

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_DOCTOR_EMAIL;
const password = process.env.SEED_DOCTOR_PASSWORD;
const fullName = process.env.SEED_DOCTOR_NAME ?? "Doctor/a";

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!email || !password) {
  console.error("Faltan SEED_DOCTOR_EMAIL o SEED_DOCTOR_PASSWORD.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName, role: "doctor" },
});

if (error) {
  if (error.message.toLowerCase().includes("already")) {
    console.log(`El doctor ${email} ya existe. Nada que hacer.`);
    process.exit(0);
  }
  console.error("Error creando el doctor:", error.message);
  process.exit(1);
}

console.log(`✔ Doctor creado: ${email} (id ${data.user?.id})`);
console.log("Ya puedes iniciar sesión en /login con esas credenciales.");
