"use client";

import { useEffect, useRef, useState } from "react";
import Spinner from "./Spinner";

type Props = {
  onScan: (isbn: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted) return;

        const scanner = new Html5Qrcode("barcode-reader");
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // ISBN-13 is 13 digits starting with 978 or 979
            const cleaned = decodedText.replace(/[^0-9]/g, "");
            if (/^97[89]\d{10}$/.test(cleaned)) {
              scanner.stop().catch(() => {});
              onScan(cleaned);
            }
          },
          () => {
            // scan failure (no barcode found in frame) - ignore
          }
        );

        if (mounted) setInitializing(false);
      } catch (err) {
        if (mounted) {
          setInitializing(false);
          setError(
            err instanceof Error && err.message.includes("Permission")
              ? "カメラへのアクセスが許可されていません"
              : "カメラの起動に失敗しました"
          );
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      html5QrCodeRef.current?.stop().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">
            ISBNバーコードをスキャン
          </h3>
          <button
            onClick={() => {
              html5QrCodeRef.current?.stop().catch(() => {});
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="relative">
          {initializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <div className="text-center">
                <Spinner className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500">カメラを起動中...</p>
              </div>
            </div>
          )}
          <div id="barcode-reader" ref={scannerRef} className="w-full" />
        </div>

        {error && (
          <div className="px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            書籍裏面のISBNバーコードにカメラを向けてください
          </p>
        </div>
      </div>
    </div>
  );
}
