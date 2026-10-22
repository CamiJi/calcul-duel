import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// base './' : le site fonctionne à la racine OU sous /nom-du-repo/
// (GitHub Pages project site), sans configuration selon le nom de repo.
export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
});
