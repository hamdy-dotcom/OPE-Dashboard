export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="text-sm text-ink-2">{title}</p>
      {hint && <p className="mt-1.5 text-[13px] text-ink-3">{hint}</p>}
    </div>
  );
}
