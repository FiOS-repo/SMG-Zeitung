import {req} from "astro/dist/core/messages.js";

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {},
	},
	plugins: [
		require('tailwindcss-motion'),
		require("flowbite/plugin")
	],
}
