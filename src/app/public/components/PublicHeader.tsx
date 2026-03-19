import Image from "next/image";

export default function PublicHeader() {
  return (
    <header className="text-center py-12 lg:py-20 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Avatar */}
        <Image
          src="/kendog.png"
          alt="Ken"
          width={96}
          height={96}
          className="w-20 h-20 lg:w-24 lg:h-24 rounded-full mx-auto mb-5 shadow-lg object-cover"
          priority
        />

        <h1 className="text-2xl lg:text-4xl font-bold text-slate-800 mb-2">
          Ken | 本好き
        </h1>
        <p className="text-base lg:text-lg text-slate-500">
          芋づる式読書の記録
        </p>
      </div>
    </header>
  );
}
