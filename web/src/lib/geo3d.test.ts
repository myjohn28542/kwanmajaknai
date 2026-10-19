import { describe, expect, it } from "vitest";
import {
  bearingDeg,
  columnHeightM,
  columnPolygon,
  lerpBearing,
  pathSampler,
  puffFractions,
  smoothstep,
} from "./geo3d";

describe("columnPolygon", () => {
  it("is a closed square of the requested size", () => {
    const [ring] = columnPolygon(100, 20, 1);
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
    const heightKm = (ring[2][1] - ring[0][1]) * 111.32;
    const widthKm = (ring[1][0] - ring[0][0]) * 111.32 * Math.cos((20 * Math.PI) / 180);
    expect(heightKm).toBeCloseTo(2, 6);
    expect(widthKm).toBeCloseTo(2, 6);
  });
});

describe("columnHeightM", () => {
  it("grows with FRP but stays bounded", () => {
    expect(columnHeightM(0)).toBe(3000);
    expect(columnHeightM(50)).toBeGreaterThan(columnHeightM(5));
    expect(columnHeightM(1000)).toBeLessThan(21000);
    expect(columnHeightM(-3)).toBe(3000);
  });
});

describe("pathSampler", () => {
  const line: [number, number][] = [
    [100, 20],
    [101, 20],
    [101, 21],
  ];
  it("hits the ends and walks by distance", () => {
    const at = pathSampler(line);
    expect(at(0)).toEqual([100, 20]);
    expect(at(1)).toEqual([101, 21]);
    // first leg is shorter (cos 20°) than the second, so the corner is before f=0.5
    const corner = Math.cos((20 * Math.PI) / 180) / (Math.cos((20 * Math.PI) / 180) + 1);
    expect(at(corner)[0]).toBeCloseTo(101, 6);
    expect(at(corner)[1]).toBeCloseTo(20, 6);
  });
  it("clamps and handles degenerate lines", () => {
    expect(pathSampler(line)(2)).toEqual([101, 21]);
    expect(pathSampler([[1, 2]])(0.5)).toEqual([1, 2]);
    expect(pathSampler([[1, 2], [1, 2]])(0.5)).toEqual([1, 2]);
  });
});

describe("puffFractions", () => {
  it("spaces puffs evenly and wraps the phase", () => {
    expect(puffFractions(4, 0)).toEqual([0, 0.25, 0.5, 0.75]);
    expect(puffFractions(2, 0.75)).toEqual([0.75, 0.25]);
    expect(puffFractions(2, -0.25)).toEqual([0.75, 0.25]);
  });
});

describe("bearingDeg", () => {
  it("gives compass bearings", () => {
    expect(bearingDeg([100, 20], [100, 21])).toBeCloseTo(0, 6);
    expect(bearingDeg([100, 20], [101, 20])).toBeCloseTo(90, 6);
    expect(bearingDeg([100, 20], [100, 19])).toBeCloseTo(180, 6);
    expect(bearingDeg([100, 20], [99, 20])).toBeCloseTo(270, 6);
  });
});

describe("lerpBearing", () => {
  it("turns the short way across north", () => {
    expect(lerpBearing(350, 10, 0.5)).toBeCloseTo(0, 6);
    expect(lerpBearing(10, 350, 0.5)).toBeCloseTo(0, 6);
    expect(lerpBearing(90, 180, 0.5)).toBeCloseTo(135, 6);
  });
});

describe("smoothstep", () => {
  it("is clamped and symmetric", () => {
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(2)).toBe(1);
  });
});
