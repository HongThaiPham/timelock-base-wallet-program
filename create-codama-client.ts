// From https://solana.stackexchange.com/questions/16703/can-anchor-client-be-used-with-solana-web3-js-2-0rc
import { createFromRoot } from 'codama';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import { renderVisitor } from '@codama/renderers-js';
import path from 'path';
import { promises as fs } from 'fs';

// Find the Anchor IDL file and return the JSON object
const loadAnchorIDL = async () => {
  const basePath = path.join('target', 'idl');
  const dirPath = path.join(basePath);

  try {
    // Read the directory contents
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      throw new Error(`No JSON files found in ${dirPath}`);
    }

    if (jsonFiles.length > 1) {
      throw new Error(
        `Multiple JSON files found in ${dirPath}. Please specify which one to use.`
      );
    }

    const filePath = path.join(dirPath, jsonFiles[0]);
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Failed to load IDL: ${dirPath} does not exist`);
    }
    throw error;
  }
};

(async () => {
  // Instantiate Codama
  const idl = await loadAnchorIDL();

  const codama = createFromRoot(rootNodeFromAnchor(idl));

  // Render JavaScript.
  const generatedPath = path.join('dist', 'js-client');
  codama.accept(renderVisitor(generatedPath));

  console.log('✅ TypeScript client SDK generated successfully!');
  console.log(`📁 Client code generated in: ${path.resolve(generatedPath)}`);
})();
