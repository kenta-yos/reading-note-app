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

  const [selection, setSelection] = useState<Rect | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const prevSelection = useRef<Rect | null>(null);

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

  useEffect(() => {
    document.body.classList.add("ocr-active");
    return () => { document.body.classList.remove("ocr-active"); };
  }, []);

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

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.85));
    stopCamera();
    setSelection(null);
    setStage("crop");
  };

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
    dragging.current = false;
    prevSelection.current = selection;
  };

  const onPointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragStart.current) return;
    const pos = getPos(e);
    if (!pos) return;
    const start = dragStart.current;
    const dx = Math.abs(pos.x - start.x);
    const dy = Math.abs(pos.y - start.y);
    if (!dragging.current && dx < 0.02 && dy < 0.02) return;
    dragging.current = true;
    setSelection({ x: Math.min(start.x, pos.x), y: Math.min(start.y, pos.y), w: dx, h: dy });
  };

  const onPointerUp = () => {
    if (!dragging.current && prevSelection.current) {
      setSelection(prevSelection.current);
    }
    dragStart.current = null;
    dragging.current = false;
  };

  const cropAndRecognize = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dataUrl: string;
    if (selection && selection.w > 0.02 && selection.h > 0.02) {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : "テキスト認識に失敗しました";
      setCameraError(msg);
      setStage("camera");
    }
  };

  const handleConfirm = () => {
    if (!recognizedText.trim()) return;
    onQuote(recognizedText.trim(), pageNum ? Number(pageNum) : null);
  };

  const hasSelection = selection && selection.w > 0.02 && selection.h > 0.02;

  // Header共通
  const header = (title: string) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0 bg-white">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );

  // カメラ・認識中: 中央モーダル
  if (stage === "camera" || stage === "recognizing") {
    return (
      <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-xl">
          {header(stage === "camera" ? "ページを撮影" : "読み取り中")}

          {stage === "camera" && (
            !cameraError ? (
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
            )
          )}

          {stage === "recognizing" && (
            <div className="px-4 py-12 text-center">
              <Spinner className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-slate-600">AIがテキストを読み取り中...</p>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Crop: フルスクリーン
  if (stage === "crop") {
    return (
      <div className="fixed inset-0 z-[60] bg-white flex flex-col">
        {header("読み取り範囲を選択")}

        <div className="flex-1 min-h-0 overflow-y-auto bg-black">
          <div
            ref={cropRef}
            className="relative select-none touch-none cursor-crosshair"
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="撮影画像" className="w-full block" draggable={false} />

            {hasSelection && (
              <>
                <div className="absolute left-0 right-0 top-0 bg-black/50" style={{ height: `${selection.y * 100}%` }} />
                <div className="absolute left-0 right-0 bottom-0 bg-black/50" style={{ height: `${(1 - selection.y - selection.h) * 100}%` }} />
                <div className="absolute left-0 bg-black/50" style={{ top: `${selection.y * 100}%`, height: `${selection.h * 100}%`, width: `${selection.x * 100}%` }} />
                <div className="absolute right-0 bg-black/50" style={{ top: `${selection.y * 100}%`, height: `${selection.h * 100}%`, width: `${(1 - selection.x - selection.w) * 100}%` }} />
                <div
                  className="absolute border-2 border-blue-400 rounded-sm"
                  style={{
                    left: `${selection.x * 100}%`,
                    top: `${selection.y * 100}%`,
                    width: `${selection.w * 100}%`,
                    height: `${selection.h * 100}%`,
                  }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelection(null); }}
                    className="absolute -top-3 -right-3 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center z-10"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
        >
          <p className="text-[11px] text-slate-400">
            {hasSelection ? "選択範囲を読み取ります" : "ドラッグで範囲選択（未選択で全体読み取り）"}
          </p>
          <button
            onClick={cropAndRecognize}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
            読み取る
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Edit: フルスクリーン
  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col">
      {header("テキスト編集")}

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <textarea
          value={recognizedText}
          onChange={(e) => setRecognizedText(e.target.value)}
          rows={10}
          className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3"
          style={{ fontSize: "16px" }}
          placeholder="認識結果を編集..."
        />
        <div className="flex items-center gap-2">
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
      </div>

      <div className="px-4 py-3 border-t border-slate-200 shrink-0"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <button
          onClick={handleConfirm}
          disabled={!recognizedText.trim()}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          引用する
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
