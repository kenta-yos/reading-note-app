import BackButton from "@/components/BackButton";
import NextReadClient from "./NextReadClient";

export default function NextReadPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-1 mb-6 lg:mb-8">
        <BackButton />
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800">
            次なに読む？
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            気分や興味を伝えると、読みたい・積読リストから5冊ピックアップします
          </p>
        </div>
      </div>
      <NextReadClient />
    </div>
  );
}
