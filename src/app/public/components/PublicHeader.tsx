import Image from "next/image";
import StatCards from "./StatCards";

type Props = {
  totalBooks: number;
  totalPages: number;
  minYear: number;
};

export default function PublicHeader({ totalBooks, totalPages, minYear }: Props) {
  return (
    <header className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(26,82,118,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center pt-16 lg:pt-24 pb-4 lg:pb-6 px-4">
        <Image
          src="/kendog.png"
          alt="Ken"
          width={112}
          height={112}
          className="w-24 h-24 lg:w-28 lg:h-28 rounded-full mx-auto mb-6 shadow-xl object-cover ring-4 ring-white"
          priority
        />

        <h1 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
          Ken
        </h1>
        <p className="text-lg lg:text-xl text-slate-500 mb-12 font-light">
          芋づる式読書の記録
        </p>

        <StatCards
          totalBooks={totalBooks}
          totalPages={totalPages}
          minYear={minYear}
        />
      </div>
    </header>
  );
}
