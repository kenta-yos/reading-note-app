type StatCardProps = {
  title: string;
  value: string | number;
  sub?: string;
  icon?: string;
};

export default function StatCard({ title, value, sub, icon }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 lg:p-5 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-base lg:text-xl">{icon}</span>}
        <p className="text-xs lg:text-sm text-slate-500 font-medium truncate">{title}</p>
      </div>
      <p className="text-xl lg:text-3xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
