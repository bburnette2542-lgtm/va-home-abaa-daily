import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { applyClaySignature, claySignFixtureDaily } from "../src/lib/clay-sign.ts";
import { buildOfficialSignedPdf } from "../src/lib/signed-pdf.ts";

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function signaturePng() {
  const w = 420;
  const h = 120;
  const row = w * 3 + 1;
  const raw = Buffer.alloc(row * h, 255);
  for (let y = 0; y < h; y++) raw[y * row] = 0;

  const ink = (x, y, r = 1) => {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const xx = Math.round(x + dx);
        const yy = Math.round(y + dy);
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const i = yy * row + 1 + xx * 3;
        raw[i] = 18;
        raw[i + 1] = 20;
        raw[i + 2] = 28;
      }
    }
  };

  const curve = (pts) => {
    for (let t = 0; t <= 1; t += 0.002) {
      const u = 1 - t;
      const x =
        u * u * u * pts[0] +
        3 * u * u * t * pts[2] +
        3 * u * t * t * pts[4] +
        t * t * t * pts[6];
      const y =
        u * u * u * pts[1] +
        3 * u * u * t * pts[3] +
        3 * u * t * t * pts[5] +
        t * t * t * pts[7];
      ink(x, y, 1);
    }
  };

  curve([30, 80, 70, 20, 110, 110, 160, 55]);
  curve([160, 55, 190, 20, 210, 95, 250, 50]);
  curve([250, 50, 290, 10, 330, 100, 390, 40]);
  curve([95, 70, 130, 90, 170, 40, 210, 75]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

const fixture = claySignFixtureDaily();
fixture.sample = false;
const report = applyClaySignature(fixture, {
  signatureDataUrl: signaturePng(),
  signatureDate: "2026-10-09",
  signedBy: "Clay",
  signedAt: "2026-10-10T00:36:00.000Z",
});
const bytes = await buildOfficialSignedPdf(report);
const out = process.argv[2] || "/opt/cursor/artifacts/clay-signed-sample.pdf";
writeFileSync(out, bytes);
console.log(out, bytes.length);
