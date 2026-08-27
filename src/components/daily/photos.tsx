import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button, Chip, Input } from "@/components/ui";
import { compressImage } from "@/lib/image";
import { PHOTO_KIND_KEY, t } from "@/lib/i18n";
import type { Lang, Photo, PhotoKind } from "@/lib/report";
import { uid } from "@/lib/utils";

const KINDS: PhotoKind[] = ["substrate", "mils", "adhesion", "defect", "location", "other"];

export function PhotoCapture({
  lang,
  photos,
  onChange,
}: {
  lang: Lang;
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
}) {
  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);

  async function ingest(files: FileList | null) {
    if (!files?.length) return;
    try {
      const next: Photo[] = [];
      for (const file of Array.from(files)) {
        if (photos.length + next.length >= 10) {
          toast.error("Max 10 photos on a daily.");
          break;
        }
        const dataUrl = await compressImage(file);
        next.push({
          id: uid(),
          dataUrl,
          caption: "",
          kind: "other",
        });
      }
      if (next.length) onChange([...photos, ...next]);
    } catch {
      toast.error("Could not add photo.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t(lang, "photosHint")}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={() => camRef.current?.click()}>
          <Camera className="size-4" />
          {t(lang, "takePhoto")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => libRef.current?.click()}>
          <ImagePlus className="size-4" />
          {t(lang, "fromLibrary")}
        </Button>
      </div>
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void ingest(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={libRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void ingest(e.target.files);
          e.target.value = "";
        }}
      />
      {photos.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-3 py-8 text-center text-sm text-muted">
          {t(lang, "emptyPhotos")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {photos.map((p) => (
            <li key={p.id} className="rounded-lg border border-line bg-paper p-3">
              <img
                src={p.dataUrl}
                alt={p.caption || p.kind}
                className="mb-2 max-h-48 w-full rounded-sm object-cover"
              />
              <div className="mb-2 flex flex-wrap gap-1.5">
                {KINDS.map((k) => (
                  <Chip
                    key={k}
                    selected={p.kind === k}
                    onClick={() =>
                      onChange(photos.map((x) => (x.id === p.id ? { ...x, kind: k } : x)))
                    }
                  >
                    {t(lang, PHOTO_KIND_KEY[k])}
                  </Chip>
                ))}
              </div>
              <Input
                placeholder={t(lang, "caption")}
                value={p.caption}
                onChange={(e) =>
                  onChange(
                    photos.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                className="mt-1 text-bad"
                onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
              >
                <Trash2 className="size-4" />
                {t(lang, "remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
