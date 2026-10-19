import { describe, expect, it } from "vitest";
import type { TambonSummary } from "./types";
import {
  hotspotsAt,
  lineShareUrl,
  nearestTambon,
  pmLevel,
  searchTambons,
  tambonFromLocation,
  thaiTime,
} from "./util";

const t = (id: string, name_th: string, amphoe_th: string, lat: number, lon: number, name_en = ""): TambonSummary => ({
  id, name_th, name_en, amphoe_th, lat, lon, status: null, top: null, pm25: null,
});

const LIST = [
  t("TH570101", "เวียง", "เมืองเชียงราย", 19.908, 99.833, "Wiang"),
  t("TH571204", "เม็งราย", "พญาเม็งราย", 19.859, 100.185, "Mengrai"),
  t("TH571201", "แม่เปา", "พญาเม็งราย", 19.89, 100.12, "Mae Pao"),
  t("TH570301", "เวียง", "เชียงของ", 20.26, 100.40, "Wiang"),
];

describe("searchTambons", () => {
  it("matches tambon names before amphoe names", () => {
    expect(searchTambons(LIST, "เม็งราย").map((x) => x.id)).toEqual(["TH571204", "TH571201"]);
  });
  it("accepts ต./อ. prefixes and English", () => {
    expect(searchTambons(LIST, "อ.พญาเม็งราย").map((x) => x.id)).toEqual(["TH571204", "TH571201"]);
    expect(searchTambons(LIST, "mae pao").map((x) => x.id)).toEqual(["TH571201"]);
  });
  it("returns everything for an empty query", () => {
    expect(searchTambons(LIST, " ")).toHaveLength(4);
  });
});

describe("nearestTambon", () => {
  it("picks the closest centroid", () => {
    expect(nearestTambon(LIST, 20.3, 100.42)?.id).toBe("TH570301");
    expect(nearestTambon(LIST, 19.86, 100.19)?.id).toBe("TH571204");
  });
});

describe("hotspotsAt", () => {
  it("drops fires not yet detected and re-bases ages", () => {
    const pts: [number, number, number, number][] = [
      [100, 20, 5, 1], // detected 1 h before latest: not visible 3 h earlier
      [100, 20, 5, 10],
      [100, 20, 5, 80], // too old at offset 3 (77 h)
    ];
    expect(hotspotsAt(pts, 3)).toEqual([[100, 20, 5, 7]]);
  });
});

describe("thaiTime", () => {
  it("formats in Bangkok time regardless of input offset", () => {
    expect(thaiTime("2026-11-20T06:00+07:00")).toBe("20 พ.ย. 06:00");
    expect(thaiTime("2026-11-19T23:00Z")).toBe("20 พ.ย. 06:00");
  });
});

describe("pmLevel", () => {
  it("uses Thai PCD bands", () => {
    expect(pmLevel(null)).toBeNull();
    expect(pmLevel(15)?.label).toBe("ดีมาก");
    expect(pmLevel(37.5)?.label).toBe("ปานกลาง");
    expect(pmLevel(37.6)?.label).toBe("เริ่มมีผลกระทบต่อสุขภาพ");
    expect(pmLevel(90)?.label).toBe("มีผลกระทบต่อสุขภาพ");
  });
});

describe("urls", () => {
  it("reads the tambon from pretty path or query", () => {
    expect(tambonFromLocation("/t/TH571204", "")).toBe("TH571204");
    expect(tambonFromLocation("/t/TH571204.html", "")).toBe("TH571204");
    expect(tambonFromLocation("/", "?tambon=TH571204&share=1")).toBe("TH571204");
    expect(tambonFromLocation("/", "?tambon=../../etc")).toBeNull();
  });
  it("builds a LINE share link with text and url", () => {
    expect(lineShareUrl("ควัน", "https://x.dev/t/TH1")).toBe(
      "https://line.me/R/share?text=%E0%B8%84%E0%B8%A7%E0%B8%B1%E0%B8%99%0Ahttps%3A%2F%2Fx.dev%2Ft%2FTH1",
    );
  });
});
