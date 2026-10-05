// Day 11 — social preview image for a shared day: GET /api/share/[token]/og
// renders a 1200x630 PNG summary card (used by the og:image / twitter:image
// meta tags on /share/[token]).
//
// Node runtime (needs Prisma + disk fonts). Fonts are static Inter TTFs
// committed under public/fonts (OFL license) — no runtime network fetch.
// Emoji are avoided: satori has no emoji font, so they'd render as boxes.

import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { getShareData } from "@/lib/share";
import { sanitizeForMarkup, sanitizeCount } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

let fontsPromise: Promise<
  Array<{ name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" }>
> | null = null;

function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const dir = path.join(process.cwd(), "public/fonts");
      const [r400, r700, r800] = await Promise.all([
        readFile(path.join(dir, "Inter-400.ttf")),
        readFile(path.join(dir, "Inter-700.ttf")),
        readFile(path.join(dir, "Inter-800.ttf")),
      ]);
      const toBuf = (b: Buffer) =>
        b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
      return [
        { name: "Inter", data: toBuf(r400), weight: 400 as const, style: "normal" as const },
        { name: "Inter", data: toBuf(r700), weight: 700 as const, style: "normal" as const },
        { name: "Inter", data: toBuf(r800), weight: 800 as const, style: "normal" as const },
      ];
    })();
  }
  return fontsPromise;
}

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const data = await getShareData(params.token);
  if (!data) {
    return new Response("Not found", { status: 404 });
  }
  const { payload } = data;
  const t = payload.totals;
  // Day 13: dish names are user-controlled (typed or AI-generated) and this
  // route renders them into SVG via satori. Sanitize EVERY dynamic string
  // before it touches the renderer — defense in depth against SVG markup
  // injection (cf. GHSA-wx4j-mvgx-mqwp).
  const niceDate = new Date(payload.date + "T12:00:00").toLocaleDateString(
    "en-PK",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );
  const calories = sanitizeCount(t.calories);
  const protein = sanitizeCount(Math.round(t.protein));
  const carbs = sanitizeCount(Math.round(t.carbs));
  const fat = sanitizeCount(Math.round(t.fat));
  const entries = sanitizeCount(t.entries);
  const topItems = payload.items.slice(0, 4).map((item) => ({
    dish: sanitizeForMarkup(item.dish),
    calories: sanitizeCount(item.calories),
  }));
  // Single string (not multiple JSX children) — satori requires an explicit
  // display:flex on any <div> with more than one child node.
  const footerLine = `${entries} ${entries === 1 ? "meal" : "meals"} tracked with AI · desi food, decoded`;

  let fonts;
  try {
    fonts = await loadFonts();
  } catch {
    return new Response("Font load failed", { status: 500 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #7c2d12 0%, #c2410c 55%, #f59e0b 100%)",
          color: "#fff",
          fontFamily: "Inter",
          padding: 56,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>
            DESI CAL AI
          </div>
          <div style={{ fontSize: 24, fontWeight: 400, opacity: 0.9 }}>
            daily summary
          </div>
        </div>

        <div style={{ display: "flex", gap: 48, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, opacity: 0.85 }}>{niceDate}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
              <span style={{ fontSize: 120, fontWeight: 800, lineHeight: 1 }}>
                {calories.toLocaleString()}
              </span>
              <span style={{ fontSize: 40, fontWeight: 700 }}>kcal</span>
            </div>
            <div style={{ display: "flex", gap: 32, marginTop: 20, fontSize: 30, fontWeight: 700 }}>
              <span>{protein}g protein</span>
              <span>{carbs}g carbs</span>
              <span>{fat}g fat</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 24 }}>
            {topItems.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", opacity: 0.95 }}>
                <span style={{ fontWeight: 400 }}>{item.dish}</span>
                <span style={{ fontWeight: 700 }}>{item.calories} kcal</span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "2px solid rgba(255,255,255,0.35)",
              fontSize: 22,
              fontWeight: 400,
              opacity: 0.9,
            }}
          >
            {footerLine}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
