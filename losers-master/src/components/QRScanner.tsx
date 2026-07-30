"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanner({
  onScan,
  onError,
}: {
  onScan: (text: string) => void;
  onError?: (msg: string) => void;
}) {
  const regionId = "qr-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (stopped) return;
          stopped = true;
          onScan(decodedText);
          scanner.stop().catch(() => {});
        },
        () => {
          // per-frame scan failures are normal, ignore
        }
      )
      .catch((err) => onError?.(String(err)));

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id={regionId} className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl" />;
}
