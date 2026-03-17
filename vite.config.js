import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync, existsSync, copyFileSync, mkdirSync } from 'fs';

// Plugin to copy game.js files to dist so GameModal can fetch them at runtime
function copyGameFiles() {
  return {
    name: 'copy-game-files',
    closeBundle() {
      const categories = ['winners', 'others'];
      for (const category of categories) {
        const categoryDir = resolve(__dirname, 'src/games', category);
        if (!existsSync(categoryDir)) continue;

        const games = readdirSync(categoryDir, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);

        for (const game of games) {
          const gameFile = resolve(categoryDir, game, 'game.js');
          if (!existsSync(gameFile)) continue;

          const destDir = resolve(__dirname, 'dist/src/games', category, game);
          mkdirSync(destDir, { recursive: true });
          copyFileSync(gameFile, resolve(destDir, 'game.js'));
        }
      }
      console.log('✅ Game files copied to dist');
    }
  };
}

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 3001,
    open: true
  },
  plugins: [copyGameFiles()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
