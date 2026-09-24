/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        noche: '#0E2240',   // texto principal, barra lateral
        cancha: {
          DEFAULT: '#1E4E8C', // azul de cancha: acciones primarias
          claro: '#2F6BB5',
          suave: '#DCE7F4',
        },
        vidrio: '#EEF3F8',  // fondo general, como el cristal de la pista
        pelota: '#DCF23A',  // acento: ganador / clasificado
        red: { DEFAULT: '#B42318' },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Arial Narrow', 'sans-serif'],
        sans: ['Barlow', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
