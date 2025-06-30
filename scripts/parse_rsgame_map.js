const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');

// Load available tiles for reference
const loadAvailableTiles = () => {
    const tilesDir = path.join(__dirname, '../coregamedata/tiles');
    const tiles = {};
    
    if (fs.existsSync(tilesDir)) {
        const files = fs.readdirSync(tilesDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const tileName = file.replace('.json', '');
                tiles[tileName] = true;
            }
        });
    }
    
    return tiles;
};

const extractRsgameXml = (rsgamePath, outputDir) => {
    console.log(`Extracting XML from .rsgame file: ${rsgamePath}`);
    
    try {
        // Read the .rsgame file (it's a ZIP)
        const zip = new AdmZip(rsgamePath);
        
        // Find the main XML file (usually the largest one)
        const zipEntries = zip.getEntries();
        let xmlEntry = null;
        
        for (const entry of zipEntries) {
            if (entry.entryName.endsWith('.xml') && !xmlEntry) {
                xmlEntry = entry;
            }
        }
        
        if (!xmlEntry) {
            throw new Error('No XML file found in .rsgame archive');
        }
        
        console.log(`Found XML file: ${xmlEntry.entryName}`);
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Extract XML to output directory
        const xmlOutputPath = path.join(outputDir, 'extracted_game.xml');
        fs.writeFileSync(xmlOutputPath, xmlEntry.getData());
        
        console.log(`XML extracted to: ${xmlOutputPath}`);
        return xmlOutputPath;
        
    } catch (error) {
        console.error(`Error extracting XML from .rsgame file: ${error.message}`);
        throw error;
    }
};

const parseRsgameMap = (rsgamePath, outputDir = null) => {
    console.log(`Parsing .rsgame file: ${rsgamePath}`);
    
    try {
        let xmlPath = rsgamePath;
        
        // If outputDir is specified, extract XML first
        if (outputDir) {
            xmlPath = extractRsgameXml(rsgamePath, outputDir);
        } else {
            // Read the .rsgame file (it's a ZIP)
            const zip = new AdmZip(rsgamePath);
            
            // Find the main XML file (usually the largest one)
            const zipEntries = zip.getEntries();
            let xmlEntry = null;
            
            for (const entry of zipEntries) {
                if (entry.entryName.endsWith('.xml') && !xmlEntry) {
                    xmlEntry = entry;
                }
            }
            
            if (!xmlEntry) {
                throw new Error('No XML file found in .rsgame archive');
            }
            
            console.log(`Found XML file: ${xmlEntry.entryName}`);
            
            // Parse the XML content directly
            const xmlContent = xmlEntry.getData().toString('utf8');
            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '@_',
                textNodeName: '#text'
            });
            
            const xmlData = parser.parse(xmlContent);
            
            // Load available tiles for reference
            const availableTiles = loadAvailableTiles();
            console.log(`Loaded ${Object.keys(availableTiles).length} available tiles for reference`);
            
            // Extract map layout data
            const mapData = {
                tiles: [],
                gameInfo: {},
                timestamp: new Date().toISOString()
            };
            
            // Function to extract map data from GameObject elements
            const extractMapData = (obj) => {
                if (typeof obj === 'object' && obj !== null) {
                    // Look for GameObject elements
                    if (obj.GameObject) {
                        const gameObjects = Array.isArray(obj.GameObject) ? obj.GameObject : [obj.GameObject];
                        
                        gameObjects.forEach(gameObj => {
                            if (gameObj.AttributeBlock) {
                                const attributeBlocks = Array.isArray(gameObj.AttributeBlock) ? gameObj.AttributeBlock : [gameObj.AttributeBlock];
                                
                                attributeBlocks.forEach(block => {
                                    if (block['@_blockName'] === 'mapGrid') {
                                        const tileInfo = extractTileInfoFromBlock(block, availableTiles);
                                        if (tileInfo) {
                                            mapData.tiles.push(tileInfo);
                                        }
                                    }
                                });
                            }
                        });
                    }
                    
                    // Recursively search nested objects
                    for (const [key, value] of Object.entries(obj)) {
                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            extractMapData(value);
                        }
                    }
                }
            };
            
            const extractTileInfoFromBlock = (block, availableTiles) => {
                let coordinates = null;
                let rotation = 0;
                let tileType = null;
                let tileName = null;
                let image = null;
                let enchanted = false;
                
                // Extract attributes from the block
                if (block.attribute) {
                    const attributes = Array.isArray(block.attribute) ? block.attribute : [block.attribute];
                    
                    attributes.forEach(attr => {
                        if (attr['@_mapposition']) {
                            const pos = attr['@_mapposition'].split(',');
                            coordinates = {
                                x: parseInt(pos[0]),
                                y: parseInt(pos[1])
                            };
                        }
                        
                        if (attr['@_maprotation']) {
                            rotation = parseInt(attr['@_maprotation']);
                        }
                        
                        if (attr['@_tile_type']) {
                            tileType = attr['@_tile_type'];
                        }
                        
                        if (attr['@_tile']) {
                            tileName = attr['@_tile'];
                        }
                        
                        if (attr['@_image']) {
                            image = attr['@_image'];
                        }
                        
                        if (attr['@_enchanted']) {
                            enchanted = true;
                        }
                    });
                }
                
                // Only include tiles that have coordinates (actual map tiles)
                if (coordinates && tileType) {
                    return {
                        coordinates,
                        rotation,
                        tileType,
                        tileName: tileName || image || `Unknown_${tileType}`,
                        image,
                        enchanted,
                        available: availableTiles[tileName] || availableTiles[image] || false
                    };
                }
                
                return null;
            };
            
            // Extract data from the XML
            extractMapData(xmlData);
            
            console.log(`Extracted ${mapData.tiles.length} map tiles`);
            
            // Log some sample tiles for debugging
            if (mapData.tiles.length > 0) {
                console.log('Sample tiles:');
                mapData.tiles.slice(0, 5).forEach(tile => {
                    console.log(`  ${tile.tileName} at (${tile.coordinates.x},${tile.coordinates.y}) rotation ${tile.rotation} type ${tile.tileType}`);
                });
            }
            
            return mapData;
        }
        
    } catch (error) {
        console.error(`Error parsing .rsgame file: ${error.message}`);
        throw error;
    }
};

// Test the parser if run directly
if (require.main === module) {
    const rsgamePath = path.join(__dirname, '../public/uploads/learning-woodsgirl.rsgame');
    
    if (fs.existsSync(rsgamePath)) {
        try {
            // Extract XML to a test folder
            const testOutputDir = path.join(__dirname, '../parsed_sessions/test-extraction');
            extractRsgameXml(rsgamePath, testOutputDir);
            console.log('XML extraction completed successfully');
        } catch (error) {
            console.error('Failed to extract XML from .rsgame file:', error.message);
        }
    } else {
        console.error(`.rsgame file not found: ${rsgamePath}`);
    }
}

module.exports = { parseRsgameMap, extractRsgameXml };
