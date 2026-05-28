#!/usr/bin/env node
const path = require('path');
const { extractMapLocations } = require('./extract_map_locations');

const xmlPath = process.argv[2] || 'extracted_game.xml';
const outputPath = process.argv[3] || 'map_locations.json';

extractMapLocations(xmlPath, outputPath)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
