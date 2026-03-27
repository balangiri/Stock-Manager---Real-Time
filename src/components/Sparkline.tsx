"use client";

import { useId } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export default function Sparkline({
  data,
  width = 120,
  height = 40,
  color,
  className = "",
}: SparklineProps) {
  const id = useId();
  const gradientId = `spark-${id.replace(/[^a-zA-Z0-9]/g, "-")}`;

  if (!data || data.length < 2) {
    return (
      <div
        className={`${className}`}
        style={{ width, height }}
        aria-hidden="true"
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const polyline = points.join(" ");

  // Create fill path (close the polygon at bottom)
  const firstX = 0;
  const lastX = width;
  const bottomY = height;
  const fillPath = `M${firstX},${bottomY} L${points[0]} L${points.slice(1).join(" L")} L${lastX},${bottomY} Z`;

  const isPositive = data[data.length - 1] >= data[0];
  const strokeColor = color ?? (isPositive ? "#22c55e" : "#ef4444");
  const fillColor = color ?? (isPositive ? "#22c55e" : "#ef4444");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
