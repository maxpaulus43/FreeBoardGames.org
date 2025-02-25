import fs from 'fs';
import path from 'path';

export async function loadGameYaml(gameId: string): Promise<string> {
  const filepath = path.join(__dirname, `../../../../node_modules/fbg-games/${gameId}/game.yaml`);
  return fs.promises.readFile(filepath, 'utf8');
}
