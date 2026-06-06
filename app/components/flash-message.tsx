"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Aviso temporal (toast) que aparece arriba y se oculta solo. */
export function FlashMessage({
  text,
  redirectTo = "/doctor",
}: {
  text: string;
  redirectTo?: string;
}) {
  const [show, setShow] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      setShow(false);
      router.replace(redirectTo);
    }, 4000);
    return () => clearTimeout(t);
  }, [router, redirectTo]);

  if (!show) return null;

  return (
    <div className="animate-pop-in fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-full border border-emerald-200 bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-600/30">
      ✓ {text}
    </div>
  );
}
