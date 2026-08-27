import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "ok";
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-navy text-paper",
        variant === "secondary" && "border border-line bg-paper-2 text-ink",
        variant === "ghost" && "text-navy",
        variant === "danger" && "bg-bad text-bad-fg",
        variant === "ok" && "bg-ok text-ok-fg",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-ink">{label}</p>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-sm border border-line bg-fill px-3 text-base text-ink outline-none ring-navy/30 placeholder:text-muted focus:bg-paper focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-sm border border-line bg-fill px-3 py-2 text-base text-ink outline-none ring-navy/30 placeholder:text-muted focus:bg-paper focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  selected,
  children,
  onClick,
  className,
}: {
  selected?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150",
        selected
          ? "border-navy bg-navy text-paper"
          : "border-line bg-paper text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function YN({
  value,
  onChange,
  yes,
  no,
}: {
  value: "Y" | "N" | "";
  onChange: (v: "Y" | "N") => void;
  yes: string;
  no: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange("Y")}
        className={cn(
          "min-h-14 rounded-md border text-base font-medium",
          value === "Y" ? "border-ok bg-ok text-ok-fg" : "border-line bg-paper text-ink",
        )}
      >
        {yes}
      </button>
      <button
        type="button"
        onClick={() => onChange("N")}
        className={cn(
          "min-h-14 rounded-md border text-base font-medium",
          value === "N" ? "border-bad bg-bad text-bad-fg" : "border-line bg-paper text-ink",
        )}
      >
        {no}
      </button>
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-line bg-paper p-4", className)}>
      {children}
    </section>
  );
}
