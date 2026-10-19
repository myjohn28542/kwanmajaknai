import { describe, expect, it } from "vitest";
import { compass8, dustCount, hazeOpacity, pmIndex, SKIES, trend, windFromBearing } from "./island";

describe("pmIndex", () => {
  it("follows the Thai PCD bands", () => {
    expect([0, 15, 15.1, 25, 37.5, 37.6, 75, 75.1].map(pmIndex)).toEqual([0, 0, 1, 1, 2, 3, 3, 4]);
    expect(pmIndex(null)).toBe(1);
    expect(SKIES).toHaveLength(5);
  });
});

describe("compass8", () => {
  it("names the eight directions in Thai", () => {
    expect(compass8(0)).toBe("เหนือ");
    expect(compass8(135)).toBe("ตะวันออกเฉียงใต้");
    expect(compass8(350)).toBe("เหนือ");
    expect(compass8(-90)).toBe("ตะวันตก");
  });
});

describe("windFromBearing", () => {
  it("points from the tambon toward where the air was earlier", () => {
    // air was further south-east 3 h ago -> wind from the south-east
    const traj: [number, number][] = [
      [100, 20],
      [100.1, 19.9],
      [100.2, 19.8],
      [100.3, 19.7],
    ];
    expect(compass8(windFromBearing(traj)!)).toBe("ตะวันออกเฉียงใต้");
  });
  it("handles short or stationary trajectories", () => {
    expect(windFromBearing([])).toBeNull();
    expect(windFromBearing([[1, 1]])).toBeNull();
    expect(windFromBearing([[1, 1], [1, 1]])).toBeNull();
    expect(windFromBearing([[100, 20], [100, 21]], 3)).toBeCloseTo(0, 6);
  });
});

describe("dust and haze scale with PM2.5", () => {
  it("is light on clean days and capped on terrible ones", () => {
    expect(dustCount(5)).toBeLessThan(dustCount(50));
    expect(dustCount(500)).toBe(160);
    expect(hazeOpacity(8)).toBe(0);
    expect(hazeOpacity(50)).toBeGreaterThan(hazeOpacity(25));
    expect(hazeOpacity(400)).toBe(0.78);
  });
});

describe("trend", () => {
  it("needs a 3 µg/m³ change to call a direction", () => {
    expect(trend(40, 30)).toBe("up");
    expect(trend(30, 40)).toBe("down");
    expect(trend(31, 30)).toBe("flat");
    expect(trend(null, 30)).toBeNull();
  });
});
