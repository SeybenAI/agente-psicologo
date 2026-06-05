export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action="/logout" method="post">
      <button
        type="submit"
        className={
          className ??
          "rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        }
      >
        Cerrar sesión
      </button>
    </form>
  );
}
