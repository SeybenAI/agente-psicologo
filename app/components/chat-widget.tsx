"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/database.types";

export type WidgetMessage = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
};

const timeFmt = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

export function ChatWidget({
  patientId,
  meId,
  meRole,
  peerName,
  initial,
}: {
  patientId: string;
  meId: string;
  meRole: Enums<"user_role">;
  peerName: string;
  initial: WidgetMessage[];
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>(initial);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const supabaseRef = useRef(createClient());
  const endRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // Suscripción en tiempo real a los mensajes de este hilo.
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`messages-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const m = payload.new as WidgetMessage;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
          if (m.sender_id !== meId && !openRef.current) {
            setUnread((u) => u + 1);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [patientId, meId]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { data, error } = await supabaseRef.current
      .from("messages")
      .insert({
        patient_id: patientId,
        sender_id: meId,
        sender_role: meRole,
        body,
      })
      .select("id, body, sender_id, created_at")
      .single();
    setSending(false);
    if (!error && data) {
      setText("");
      setMessages((prev) =>
        prev.some((x) => x.id === data.id) ? prev : [...prev, data]
      );
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {open ? (
        <div className="flex h-[28rem] w-[20rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96">
          {/* Cabecera */}
          <div className="flex items-center justify-between bg-linear-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{peerName}</p>
                <p className="text-[11px] text-indigo-100">En tiempo real</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full px-2 text-lg text-indigo-100 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar chat"
            >
              ✕
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-slate-50 p-3">
            {messages.length === 0 ? (
              <p className="m-auto text-center text-sm text-slate-400">
                Aún no hay mensajes.
                <br />
                Escribe el primero 👋
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === meId;
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.body}</p>
                      <p
                        className={`mt-0.5 text-[10px] ${mine ? "text-indigo-200" : "text-slate-400"}`}
                      >
                        {timeFmt.format(new Date(m.created_at))}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {/* Entrada */}
          <form
            onSubmit={send}
            className="flex items-center gap-2 border-t border-slate-200 p-2.5"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
              maxLength={2000}
              placeholder="Escribe un mensaje…"
              className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              ➤
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-r from-indigo-600 to-violet-600 text-2xl text-white shadow-xl shadow-indigo-500/40 transition-transform hover:scale-105"
          aria-label="Abrir chat"
        >
          💬
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
              {unread}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
