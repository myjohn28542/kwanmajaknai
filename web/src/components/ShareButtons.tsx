import { useState } from "react";
import { facebookShareUrl, lineShareUrl, xShareUrl } from "../lib/util";

type Props = { url: string; text: string; imageUrl: string; fileName: string };

export function ShareButtons({ url, text, imageUrl, fileName }: Props) {
  const [note, setNote] = useState<string | null>(null);
  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 2500);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      flash("คัดลอกลิงก์แล้ว");
    } catch {
      // In-app browsers often block the clipboard API; fall back to a prompt.
      window.prompt("คัดลอกลิงก์", url);
    }
  };

  // Phones: native share sheet with the picture attached (LINE, Facebook, Instagram,
  // TikTok, ...). Elsewhere: save the picture so it can be posted by hand.
  const shareImage = async () => {
    try {
      const blob = await (await fetch(imageUrl, { cache: "no-cache" })).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "ควันมาจากไหน", text: `${text}\n${url}` });
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      flash("บันทึกรูปแล้ว นำไปโพสต์ได้เลย");
    } catch (e) {
      if ((e as Error).name !== "AbortError") flash("แชร์รูปไม่สำเร็จ ลองใช้ปุ่มด้านล่างแทน");
    }
  };

  return (
    <div className="share">
      <button className="btn primary" type="button" onClick={shareImage}>
        แชร์รูปภาพ
      </button>
      <a className="btn line" href={lineShareUrl(text, url)} target="_blank" rel="noopener">
        LINE
      </a>
      <a className="btn fb" href={facebookShareUrl(url)} target="_blank" rel="noopener">
        Facebook
      </a>
      <a className="btn x" href={xShareUrl(text, url)} target="_blank" rel="noopener">
        X
      </a>
      <button className="btn copy" type="button" onClick={copy}>
        คัดลอกลิงก์
      </button>
      {note && (
        <p className="share-note small" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
