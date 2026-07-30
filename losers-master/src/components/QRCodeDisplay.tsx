"use client";

import { QRCodeSVG } from "qrcode.react";

export default function QRCodeDisplay({ value, size = 220 }: { value: string; size?: number }) {
  return (
    <div className="inline-block rounded-2xl bg-white p-4 shadow-card">
      <QRCodeSVG value={value} size={size} level="M" />
    </div>
  );
}
