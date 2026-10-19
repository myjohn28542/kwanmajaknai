import { useCallback } from "react";
import type { HotspotPoint, Snapshot, TambonSummary } from "../lib/types";
import { thaiTime } from "../lib/util";
import { MapView } from "./MapView";
import { RegionBar } from "./RegionBar";
import { PmBadge } from "./ResultCard";

declare global {
  interface Window {
    __shareReady?: boolean;
  }
}

/** 1200x630 card that pipeline/render.py screenshots for og:image. */
export function ShareView({
  tambon,
  snapshot,
  hotspots,
}: {
  tambon: TambonSummary;
  snapshot: Snapshot;
  hotspots: HotspotPoint[];
}) {
  const onIdle = useCallback(() => {
    document.fonts.ready.then(() => {
      window.__shareReady = true;
    });
  }, []);
  return (
    <div className="shareview">
      <div className="shareview-map">
        <MapView tambons={[]} selected={tambon} snapshot={snapshot} hotspots={hotspots} interactive={false} onIdle={onIdle} />
      </div>
      <div className="shareview-panel">
        <div className="shareview-brand">
          ควันมาจากไหน <span className="badge">ประมาณการ / estimate</span>
        </div>
        <p className="shareview-sentence">{snapshot.sentence}</p>
        <RegionBar regions={snapshot.regions} compact />
        <div className="shareview-foot">
          <PmBadge value={snapshot.pm25} />
          <span>{thaiTime(snapshot.t)} น.</span>
        </div>
      </div>
    </div>
  );
}
