"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Spinner from "./Spinner";

type Props = {
  onQuote: (text: string, page: number | null) => void;
  onClose: () => void;
};

type Stage = "camera" | "crop" | "recognizing" | "edit";
type Rect = { x: number; y: number; w: number; h: number };

export default function OcrCamera({ onQuote, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>("camera");
  const [cameraError, setCameraError] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [recognizedText, setRecognizedText] = useState("");
  const [pageNum, setPageNum] = useState("");
  const [capturedImage, setCapturedImage] = useState("");

  // 選択矩形（表示座標系: cropRef内の%）
  const [selection, setSelection] = useState<Rect | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

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

  // カメラ起動
  useEffect(() => {
    let mounted = true;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (mounted) setInitializing(false);
      } catch (err) {
        if (mounted) {
          setInitializing(false);
          if (err instanceof Error && (err.name === "NotAllowedError" || err.message.includes("Permission"))) {
            setCameraError("カメラへのアクセスが許可されていません");
          } else {
            setCameraError("カメラを起動できませんでした");
          }
        }
      }
    }
    startCamera();
    return () => {
      mounted = false;
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    };
  }, []);

  // 撮影 → crop ステージへ
  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    setSelection(null);
    setStage("crop");
  };

  // タッチ/マウスで矩形選択
  const getPos = (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } | null => {
    const el = cropRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const onPointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    const pos = getPos(e);
    if (!pos) return;
    dragStart.current = pos;
    setSelection({ x: pos.x, y: pos.y, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragStart.current) return;
    const pos = getPos(e);
    if (!pos) return;
    const start = dragStart.current;
    setSelection({
      x: Math.min(start.x, pos.x),
      y: Math.min(start.y, pos.y),
      w: Math.abs(pos.x - start.x),
      h: Math.abs(pos.y - start.y),
    });
  };

  const onPointerUp = () => {
    dragStart.current = null;
  };

  // 選択範囲をクロップしてOCR
  const cropAndRecognize = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dataUrl: string;

    if (selection && selection.w > 0.02 && selection.h > 0.02) {
      // 選択範囲をクロップ
      const sx = Math.round(selection.x * canvas.width);
      const sy = Math.round(selection.y * canvas.height);
      const sw = Math.round(selection.w * canvas.width);
      const sh = Math.round(selection.h * canvas.height);

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = sw;
      cropCanvas.height = sh;
      const ctx = cropCanvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      dataUrl = cropCanvas.toDataURL("image/jpeg", 0.85);
    } else {
      // 選択なし → 全体
      dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    }

    setStage("recognizing");

    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecognizedText(data.text);
      setStage("edit");
    } catch {
      setCameraError("テキスト認識に失敗しました");
      setStage("camera");
    }
  };

  const handleConfirm = () => {
    if (!recognizedText.trim()) return;
    onQuote(recognizedText.trim(), pageNum ? Number(pageNum) : null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <h3 className="text-sm font-semibold text-slate-800">
            {stage === "crop" ? "読み取り範囲を選択" : stage === "edit" ? "テキスト編集" : "ページを撮影"}
          </h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Camera stage */}
        {stage === "camera" && (
          <>
            {!cameraError ? (
              <div className="relative bg-black aspect-[3/4]">
                {initializing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                    <div className="text-center">
                      <Spinner className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">カメラを起動中...</p>
                    </div>
                  </div>
                )}
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                {!initializing && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <button
                      onClick={capture}
                      className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 shadow-lg active:scale-95 transition-transform"
                      aria-label="撮影"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-red-600">{cameraError}</p>
              </div>
            )}
          </>
        )}

        {/* Crop stage */}
        {stage === "crop" && (
          <>
            <div
              ref={cropRef}
              className="relative bg-black select-none touch-none cursor-crosshair"
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedImage} alt="撮影画像" className="w-full block" draggable={false} />

              {/* 暗いオーバーレイ（選択範囲の外） */}
              {selection && selection.w > 0.01 && selection.h > 0.01 && (
                <>
                  {/* top */}
                  <div className="absolute left-0 right-0 top-0 bg-black/50" style={{ height: `${selection.y * 100}%` }} />
                  {/* bottom */}
                  <div className="absolute left-0 right-0 bottom-0 bg-black/50" style={{ height: `${(1 - selection.y - selection.h) * 100}%` }} />
                  {/* left */}
                  <div className="absolute left-0 bg-black/50" style={{ top: `${selection.y * 100}%`, height: `${selection.h * 100}%`, width: `${selection.x * 100}%` }} />
                  {/* right */}
                  <div className="absolute right-0 bg-black/50" style={{ top: `${selection.y * 100}%`, height: `${selection.h * 100}%`, width: `${(1 - selection.x - selection.w) * 100}%` }} />
                  {/* 選択枠 */}
                  <div
                    className="absolute border-2 border-blue-400 rounded-sm"
                    style={{
                      left: `${selection.x * 100}%`,
                      top: `${selection.y * 100}%`,
                      width: `${selection.w * 100}%`,
                      height: `${selection.h * 100}%`,
                    }}
                  />
                </>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <p className="text-[11px] text-slate-400">
                {selection && selection.w > 0.02 ? "選択範囲を読み取ります" : "ドラッグで範囲選択（未選択で全体読み取り）"}
              </p>
              <button
                onClick={cropAndRecognize}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
              >
                読み取る
              </button>
            </div>
          </>
        )}

        {/* Recognizing stage */}
        {stage === "recognizing" && (
          <div className="px-4 py-12 text-center">
            <Spinner className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <p className="text-sm text-slate-600">AIがテキストを読み取り中...</p>
          </div>
        )}

        {/* Edit stage */}
        {stage === "edit" && (
          <div className="p-4 overflow-y-auto flex-1">
            <textarea
              value={recognizedText}
              onChange={(e) => setRecognizedText(e.target.value)}
              rows={8}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3"
              style={{ fontSize: "16px" }}
              placeholder="認識結果を編集..."
            />
            <div className="flex items-center gap-2 mb-4">
              <label className="text-xs text-slate-500 shrink-0">ページ番号</label>
              <input
                type="number"
                value={pageNum}
                onChange={(e) => setPageNum(e.target.value)}
                placeholder="任意"
                inputMode="numeric"
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                style={{ fontSize: "16px" }}
              />
            </div>
            <button
              onClick={handleConfirm}
              disabled={!recognizedText.trim()}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              引用する
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
