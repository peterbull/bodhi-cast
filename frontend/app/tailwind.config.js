/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: "#03e9f4",
        lightneon: "#95f2f7",
        hoverneon: "#bff7fa",
        focusbg: "#00f2ffbd",
      },
    },
  },
  plugins: [],
};
