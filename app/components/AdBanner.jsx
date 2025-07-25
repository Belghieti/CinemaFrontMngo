"use client";

import { useEffect, useRef } from "react";

export default function AdBanner() {
  const adRef = useRef(null);

  useEffect(() => {
    try {
      if (
        typeof window !== "undefined" &&
        window.adsbygoogle &&
        adRef.current
      ) {
        // Vérifie si une pub n’est pas déjà injectée dans ce bloc
        if (!adRef.current.hasAttribute("data-ad-status")) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      }
    } catch (e) {
      console.error("Adsense error", e);
    }
  }, []);

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: "block", textAlign: "center" }}
      data-ad-client="ca-pub-7819050999307874"
      data-ad-slot="1234567890" // 🔁 Remplace par ton vrai ad-slot
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
