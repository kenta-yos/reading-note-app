"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Props = {
  years: number[];
  currentYear: number | "all";
  showAllOption?: boolean;
};

export default function YearSelector({ years, currentYear, showAllOption = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      value={currentYear}
      onChange={handleChange}
      className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
    >
      {showAllOption && <option value="all">全ての年</option>}
      {years.map((y) => (
        <option key={y} value={y}>
          {y}年
        </option>
      ))}
    </select>
  );
}
