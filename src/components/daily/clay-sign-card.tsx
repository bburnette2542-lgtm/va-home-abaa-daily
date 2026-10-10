import { Eraser, Pencil } from "lucide-react";
import { useEffect, useRef, type PointerEvent } from "react";

function useClaySignPad(value: string, onChange: (dataUrl: string) => void) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = value;
    }
  }, []);

  function pos(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(e.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    onChange("");
  }

  return { canvasRef, start, move, end, clear };
}

export function ClaySignatureCard({
  name,
  date,
  signature,
  status,
  busy,
  canSave,
  onName,
  onDate,
  onSignature,
  onSave,
}: {
  name: string;
  date: string;
  signature: string;
  status: string;
  busy: boolean;
  canSave: boolean;
  onName: (value: string) => void;
  onDate: (value: string) => void;
  onSignature: (value: string) => void;
  onSave: () => void;
}) {
  const pad = useClaySignPad(signature, onSignature);

  return (
    <section className="px-4 pb-10">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#9a9a9a]">
        <Pencil className="size-3.5 text-[#c5a35a]" />
        Signatures
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a9a9a]">Clay</p>
      <p className="mt-1 text-[15px] text-[#f2f2f2]">{status}</p>

      <div className="mt-4 rounded-2xl bg-[#161616] px-4 py-5">
        <div className="mb-3 flex items-center gap-2 text-[17px] font-medium text-white">
          <Pencil className="size-4 text-[#c5a35a]" />
          Clay signature
        </div>
        <p className="mb-3 text-[14px] text-[#c8c8c8]">Sign with your finger in the box</p>
        <canvas
          ref={pad.canvasRef}
          className="h-36 w-full touch-none rounded-md border-2 border-dashed border-[#b8b8b8] bg-white"
          onPointerDown={pad.start}
          onPointerMove={pad.move}
          onPointerUp={pad.end}
          onPointerCancel={pad.end}
        />

        <label className="mt-5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a9a9a]">
          Your name
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => onName(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl bg-black px-4 text-base text-white outline-none ring-[#c5a35a]/40 placeholder:text-[#6b6b6b] focus:ring-2"
          />
        </label>

        <label className="mt-4 block text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a9a9a]">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => onDate(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl bg-black px-4 text-base text-white outline-none ring-[#c5a35a]/40 focus:ring-2 [color-scheme:dark]"
          />
        </label>

        <p className="mt-3 text-[13px] text-[#9a9a9a]">Draw your signature and enter your name to save.</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={pad.clear}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#3a3a3a] bg-[#111] px-4 text-[15px] font-medium text-white"
          >
            <Eraser className="size-4" />
            Clear
          </button>
          <button
            type="button"
            disabled={busy || !canSave}
            onClick={onSave}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c5a35a] px-4 text-[15px] font-medium text-black disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save signature"}
          </button>
        </div>
      </div>
    </section>
  );
}
