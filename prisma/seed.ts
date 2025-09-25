// nesse arquivo utilizei IA para me dar um caminho, porém, precisei ajustar o código gerado para funcionar corretamente


import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type CityInput = {
  name: string;
  state?: string | null;
  country?: string | null;
  lat?: number | null;
  lon?: number | null;
  population?: number | null;
  timezone?: string | null;
  ibgeCode?: string | null;
};


async function readCSV(filePath: string): Promise<CityInput[]> {
  const raw = (await fs.promises.readFile(filePath, "utf-8")).replace(/^\uFEFF/, "");
  const sep = raw.includes(";") && !raw.includes(",") ? ";" : ",";
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const normalize = (s: string) =>
    s.trim().replace(/^"|"$/g, "").toLowerCase()
      .normalize("NFD").replace(/\p{Diacritic}/gu, "");

  function parseHeaders(headerLine: string, sep: string) {
    const headers = headerLine.split(sep).map((h) => normalize(h));
    const pick = (...keys: string[]) => headers.findIndex((x) => keys.includes(x));
    const iName = (() => {
      const i = pick("name", "city", "city_ascii");
      if (i < 0) throw new Error(`CSV precisa ter name/city/city_ascii`);
      return i;
    })();
    return {
      iName,
      iState: pick("admin_name", "state", "uf", "estado"),
      iCountry: pick("country", "pais"),
      iLat: pick("lat", "latitude"),
      iLon: pick("lon", "lng", "long", "longitude"),
      iPopulation: pick("population", "populacao"),
      iTimezone: pick("timezone", "tz", "fuso"),
      iIbge: pick("ibgecode", "ibge", "codigoibge", "codigo_ibge", "id"),
    };
  }

  function mapLineToCity(cols: string[], idx: ReturnType<typeof parseHeaders>) {
    const toNum = (s?: string) => (s?.length ? Number(s.replace(",", ".")) : undefined);
    const name = cols[idx.iName];
    if (!name) return null;
    return {
      name,
      state: idx.iState >= 0 ? cols[idx.iState] || null : null,
      country: idx.iCountry >= 0 ? cols[idx.iCountry] || "Brasil" : "Brasil",
      lat: idx.iLat >= 0 ? toNum(cols[idx.iLat]) ?? null : null,
      lon: idx.iLon >= 0 ? toNum(cols[idx.iLon]) ?? null : null,
      population: idx.iPopulation >= 0 ? toNum(cols[idx.iPopulation]) ?? null : null,
      timezone: idx.iTimezone >= 0 ? cols[idx.iTimezone] || null : null,
      ibgeCode: idx.iIbge >= 0 ? cols[idx.iIbge] || null : null,
    };
  }

  const header = lines.shift()!;
  const idx = parseHeaders(header, sep);
  const clean = (s: string) => s.trim().replace(/^"|"$/g, "");

  const out: CityInput[] = [];
  for (const line of lines) {
    const cols = line.split(sep).map((c) => clean(c));
    const city = mapLineToCity(cols, idx);
    if (city) out.push(city);
  }
  return out;
}
async function readJSON(filePath: string): Promise<CityInput[]> {
  const raw = await fs.promises.readFile(filePath, "utf-8");
  const data: unknown = JSON.parse(raw);
  if (Array.isArray(data)) return data as CityInput[];
  if (
    typeof data === "object" &&
    data !== null &&
    "cities" in data &&
    Array.isArray((data as { cities?: unknown }).cities)
  ) {
    return (data as { cities: CityInput[] }).cities;
  }
  throw new Error(`JSON inválido em ${filePath}`);
}

async function loadCities(): Promise<CityInput[]> {
  const base = path.join(process.cwd(), "public", "cities");
  if (!fs.existsSync(base)) return [];
  const files = (await fs.promises.readdir(base))
    .filter((f) => /\.(json|csv)$/i.test(f))
    .map((f) => path.join(base, f));

  const all: CityInput[] = [];
  for (const f of files) {
    if (f.toLowerCase().endsWith(".json")) all.push(...(await readJSON(f)));
    else all.push(...(await readCSV(f)));
  }
  return all;
}

function chunk<T>(arr: T[], size = 1000): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const citiesRaw = await loadCities();

  const cities = citiesRaw
    .filter((c) => c.name?.trim())
    .map((c) => ({
      name: c.name.trim(),
      state: c.state ?? null,
      country: c.country ?? "Brasil",
      lat: c.lat ?? null,
      lon: c.lon ?? null,
      population: c.population ?? null,
      timezone: c.timezone ?? null,
      ibgeCode: c.ibgeCode ?? null,
    }));

  const withCode = cities.filter((c) => c.ibgeCode?.trim());
  const withoutCode = cities.filter((c) => !c.ibgeCode);

  const seen = new Set<string>();
  const dedupWithout = withoutCode.filter((c) => {
    const key = `${c.name}|${c.state ?? ""}|${c.country ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let created = 0;

  for (const group of chunk(withCode, 1000)) {
    const { count } = await prisma.city.createMany({
      data: group,
      skipDuplicates: true,
    });
    created += count;
    console.log(`[withCode] +${count} (total ${created})`);
  }

  for (const group of chunk(dedupWithout, 1000)) {
    const { count } = await prisma.city.createMany({
      data: group,
      skipDuplicates: true,
    });
    created += count;
    console.log(`[withoutCode] +${count} (total ${created})`);
  }

  console.log(`Seed OK. Inseridos ${created} registros (em batches).`);
}

main().catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
