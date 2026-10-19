import { useState } from "react";
import { facebookShareUrl, lineShareUrl } from "../lib/util";

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // In-app browsers often block the clipboard API; fall back to a prompt.
      window.prompt("คัดลอกลิงก์", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="share">
      <a className="btn line" href={lineShareUrl(text, url)} target="_blank" rel="noopener">
        แชร์ไป LINE
      </a>
      <a className="btn fb" href={facebookShareUrl(url)} target="_blank" rel="noopener">
        แชร์ไป Facebook
      </a>
      <button className="btn" type="button" onClick={copy}>
        {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
      </button>
    </div>
  );
}
