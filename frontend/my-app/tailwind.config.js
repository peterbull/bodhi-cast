/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: "#03e9f4",
        lightneon: "#95f2f7",
        hoverneon: "#bff7fa",
        focusbg: "#00f2ffbd",
      },
    }
  },
  plugins: []
};
