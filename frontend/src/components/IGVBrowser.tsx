"use client"; // This is a client component

import React, { useEffect } from "react";
import Script from "next/script";

interface IGVBrowserProps {
  options: IgvBrowserOptions;
}

const IGVBrowser: React.FC<IGVBrowserProps> = ({ options }) => {
  useEffect(() => {
    let isCancelled = false;
    const tryInit = () => {
      const igvDiv = document.getElementById("igv-div");
      if (!isCancelled && igvDiv && typeof igv !== "undefined") {
        igv
          .createBrowser(igvDiv, options)
          .then(() => {
            console.log("Created IGV browser");
          })
          .catch((error: unknown) => {
            console.error("Error creating IGV browser:", error);
          });
      }
    };

    // In case the script hasn't loaded yet, poll briefly
    const intervalId = window.setInterval(() => {
      if (typeof igv !== "undefined") {
        window.clearInterval(intervalId);
        tryInit();
      }
    }, 100);

    // Also attempt immediately
    tryInit();

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [options]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/igv@2.15.9/dist/igv.min.js"
        strategy="afterInteractive"
      />
      <div id="igv-div" style={{ width: "100%", height: "500px" }} />
    </>
  );
};

export default IGVBrowser;
