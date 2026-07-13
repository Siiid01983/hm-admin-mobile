/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Hello Moving brand palette (mirrors the website CLAUDE.md).
      colors: {
        brand: {
          DEFAULT: '#2C3626', // dark green
          sage: '#9AB57A',    // sage
          cream: '#F9F9F6',   // off-white
        },
      },
    },
  },
  plugins: [],
};
