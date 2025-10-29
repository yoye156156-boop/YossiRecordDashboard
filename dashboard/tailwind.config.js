/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      boxShadow: { card: "0 4px 16px rgba(0,0,0,0.08)" },
      colors: { brand: {100:"#dbeafe",600:"#2563eb",700:"#1d4ed8"} }
    }
  },
  plugins: []
}
