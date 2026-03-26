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

      <div className="relative max-w-3xl mx-auto pt-8 lg:pt-10 pb-2 lg:pb-3 px-4">
        {/* Avatar + Name + Subtitle row */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <Image
            src="/kendog.png"
            alt="Kenta"
            width={80}
            height={80}
            className="w-16 h-16 lg:w-20 lg:h-20 rounded-full shadow-lg object-cover ring-[3px] ring-white flex-shrink-0"
            priority
          />
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              Kenta
            </h1>
            <p className="text-sm lg:text-base text-slate-500 font-light">
              学術と日常をつなぐ
            </p>
          </div>
        </div>

        <StatCards
          totalBooks={totalBooks}
          totalPages={totalPages}
          minYear={minYear}
        />
      </div>
    </header>
  );
}
