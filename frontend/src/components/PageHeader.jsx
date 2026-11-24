export default function PageHeader({ title, description, action }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="flex items-stretch gap-3">
      <span aria-hidden="true" className="w-1.5 shrink-0 rounded-full bg-gradient-to-b from-gold-400 to-maroon-700" />
      <div><h1 className="text-2xl font-bold tracking-tight text-maroon-800">{title}</h1>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
    </div>
    {action}
  </div>;
}
