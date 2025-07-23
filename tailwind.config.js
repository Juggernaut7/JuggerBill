/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        background: {
          50: '#1a1a1a', // Custom dark background shade
          100: '#2a2a2a',
        },
      },
    },
  },
  plugins: [],
}