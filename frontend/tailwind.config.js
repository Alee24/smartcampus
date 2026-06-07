/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'var(--primary-color)',
                    50: '#eff6ff',
                    100: '#dbeafe',
                    500: 'var(--primary-color)', // Dynamic from CSS
                    600: 'var(--secondary-color)', // Mapping logic
                    gradient: 'var(--gradient-primary)'
                },
                secondary: 'var(--secondary-color)',
                accent: 'var(--accent-color)',
                dark: {
                    bg: 'var(--bg-primary)',
                    surface: 'var(--bg-surface)',
                    border: 'var(--border-color)'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Lora', 'Georgia', 'ui-serif', 'serif'],
            }
        },
    },
    plugins: [],
}
