import React from "react";

export default function ApiLink({ url }) {
  if (!url) return null;
  const clean = String(url).replace(/\/+$/, "");
  return (
    <a
      href={clean}
      target="_blank"
      rel="noreferrer"
      className="underline text-blue-700 hover:text-blue-900"
      title="פתח את כתובת ה-API"
    >
      {clean}
    </a>
  );
}
