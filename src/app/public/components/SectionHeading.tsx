export default function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-6 lg:mb-8">
      <div className="flex items-center gap-4 mb-3 max-w-xs mx-auto">
        <div className="h-px flex-1 bg-slate-200" />
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] shrink-0">
          {title}
        </h2>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      {subtitle && (
        <p className="text-sm text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}
