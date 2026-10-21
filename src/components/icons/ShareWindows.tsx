import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

/**
 * Předloha: Fluent UI System Icons, Share 20 Regular.
 * Licence: MIT, https://github.com/microsoft/fluentui-system-icons
 *
 * Fluent kreslí obrys výplní, lucide tahem. Aby ikona v toolbaru měla stejnou
 * tloušťku čar jako ostatní, je překreslená tahem po ose Fluent obrysu
 * (souřadnice z 20) a strokeWidth se přepočítá z 24 na výřez 19 — v pixelech pak
 * vyjde stejně jako u lucide ikon.
 */
export const ShareWindows = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color = "currentColor", className, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      // Osa obrysu leží v x 3,5–18,3 a y 3,1–16,5: výřez 19 jednotek kolem jejího
      // středu, ať je ikona stejně velká jako lucide (obsah ~12 px z 16).
      viewBox="1.4 0.3 19 19"
      fill="none"
      stroke={color}
      strokeWidth={((Number(strokeWidth) || 2) * 19) / 24}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Rámeček s mezerou vpravo nahoře, kudy šipka vychází. */}
      <path d="M9.5 3.5H6A2.5 2.5 0 0 0 3.5 6v8A2.5 2.5 0 0 0 6 16.5h8a2.5 2.5 0 0 0 2.5-2.5v-1.5" />
      {/* Šipka: hrot vpravo, ohnutý ocas vlevo dole. */}
      <path d="M13.5 3.1 18.3 7l-4.8 3.9V8.8c-2.1.1-3.7 1-4.8 2-1 .9-1.7 1.9-2.2 2.7 0-2.2.4-4.3 1.4-5.8 1.1-1.7 2.9-2.7 5.6-2.7Z" />
    </svg>
  ),
);

ShareWindows.displayName = "ShareWindows";
