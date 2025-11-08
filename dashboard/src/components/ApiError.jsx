import React from "react";

export default function ApiError({ text }) {
  if (!text) return null;
  return (
    <div className="mt-2 p-2 rounded bg-red-50 text-red-700 text-sm" dir="rtl">
      {text}
    </div>
  );
}
