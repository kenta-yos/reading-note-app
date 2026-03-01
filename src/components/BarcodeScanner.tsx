"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Spinner from "./Spinner";

type Props = {
  onScan: (isbn: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [manualIsbn, setManualIsbn] = useState("");
  const [supportsDetector, setSupportsDetector] = useState(true);
  const scannedRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const handleManualSubmit = useCallback(() => {
    const cleaned = manualIsbn.replace(/[^0-9]/g, "");
    if (/^97[89]\d{10}$/.test(cleaned)) {
      stopCamera();
      onScan(cleaned);
    } else if (/^\d{10}$/.test(cleaned)) {
      // ISBN-10 も受け付ける
      stopCamera();
      onScan(cleaned);
    }
  }, [manualIsbn, stopCamera, onScan]);

  useEffect(() => {
    let mounted = true;
    let animFrameId: number;

    async function startScanner() {
      // BarcodeDetector の存在チェック
      if (!("BarcodeDetector" in window)) {
        if (mounted) {
          setSupportsDetector(false);
          setInitializing(false);
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (mounted) setInitializing(false);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ["ean_13"] });

        const scan = async () => {
          if (!mounted || scannedRef.current) return;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const barcodes: any[] = await detector.detect(video);
            for (const barcode of barcodes) {
              const cleaned = barcode.rawValue?.replace(/[^0-9]/g, "") ?? "";
              if (/^97[89]\d{10}$/.test(cleaned)) {
                scannedRef.current = true;
                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                onScanRef.current(cleaned);
                return;
              }
            }
          } catch {
            // detect can fail on some frames - ignore
          }
          animFrameId = requestAnimationFrame(scan);
        };

        // フレームレートを抑える（約200ms間隔）
        const throttledScan = () => {
          scan();
        };
        setTimeout(throttledScan, 500); // カメラ安定待ち
      } catch (err) {
        if (mounted) {
          setInitializing(false);
          if (err instanceof Error && (err.name === "NotAllowedError" || err.message.includes("Permission"))) {
            setError("カメラへのアクセスが許可されていません");
          } else {
            setSupportsDetector(false);
          }
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      scannedRef.current = true;
      cancelAnimationFrame(animFrameId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">
            ISBNバーコードをスキャン
          </h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {supportsDetector ? (
          <>
            <div className="relative bg-black aspect-[4/3]">
              {initializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                  <div className="text-center">
                    <Spinner className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">カメラを起動中...</p>
                  </div>
                </div>
              )}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {!initializing && !error && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-20 border-2 border-white/60 rounded-lg" />
                </div>
              )}
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
          </>
        ) : (
          <div className="px-4 py-4">
            <p className="text-sm text-slate-600 mb-3">
              このブラウザではカメラスキャンに対応していません。ISBNを手入力してください。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                placeholder="978..."
                inputMode="numeric"
                className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                style={{ fontSize: "16px" }}
                onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
              />
              <button
                type="button"
                onClick={handleManualSubmit}
                disabled={manualIsbn.replace(/[^0-9]/g, "").length < 10}
                className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                検索
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
