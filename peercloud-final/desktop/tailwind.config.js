/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19', // Deep space dark
        surface: '#1A2033', // Slightly lighter surface
        primary: '#3B82F6', // Blue
        primaryHover: '#2563EB',
        accent: '#10B981', // Emerald
      }
    },
  },
  plugins: [],
}
