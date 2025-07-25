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
    <div>
      <script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7819050999307874"
        crossorigin="anonymous"
      ></script>
    </div>
  );
}
