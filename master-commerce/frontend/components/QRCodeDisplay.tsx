"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface Props {
  text: string;
  size?: number;
  className?: string;
  id?: string;
}

export default function QRCodeDisplay({ text, size = 260, className = "", id = "qr-code-img" }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!text) return;
    QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#1c1b1b",
        light: "#ffffff",
      },
    })
      .then((url) => {
        setDataUrl(url);
        setError(false);
      })
      .catch((err) => {
        console.error("Erreur génération QR Code:", err);
        setError(true);
      });
  }, [text, size]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-neutral-100 text-neutral-500 rounded-2xl p-4 text-xs font-mono text-center w-48 h-48 ${className}`}>
        <span>⚠️ Erreur QR Code</span>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className={`flex flex-col items-center justify-center bg-neutral-100 animate-pulse rounded-2xl w-48 h-48 ${className}`}>
        <span className="text-xs text-neutral-400 font-sans">Génération du QR Code...</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      id={id}
      src={dataUrl}
      alt="QR Code officiel du catalogue"
      className={`rounded-2xl border-2 border-surface-container-high bg-white p-3 shadow-md hover:scale-105 transition-transform duration-300 ${className}`}
    />
  );
}
