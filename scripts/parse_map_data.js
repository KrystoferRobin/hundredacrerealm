const fs = require('fs');
const xml2js = require('xml2js');
const path = require('path');

async function parseMapData() {
    // Use extracted_game.xml in current directory if no argument
    let xmlFile = process.argv[2] || 'extracted_game.xml';
    if (!fs.existsSync(xmlFile)) {
        console.error('XML file not found:', xmlFile);
        process.exit(1);
    }
    const outputPath = 'map_data.json';
    
    console.log(`Processing map data for session: ${xmlFile}`);
    console.log(`XML file: ${xmlFile}`);
    console.log(`Output file: ${outputPath}`);
    
    try {
        // Read the XML file
        const xmlData = fs.readFileSync(xmlFile, 'utf8');
        
        // Parse XML
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);
        
        const mapTiles = [];
        
        // Find all GameObjects with mapGrid AttributeBlocks
        const objects = result.game.objects[0].GameObject;
        
        objects.forEach(obj => {
            if (obj.AttributeBlock) {
                obj.AttributeBlock.forEach(block => {
                    if (block.$.blockName === 'mapGrid') {
                        // Extract map position and rotation
                        let position = null;
                        let rotation = 0;
                        let tileType = null;
                        let tileName = null;
                        let image = null;
                        let isEnchanted = false;
                        
                        if (block.attribute) {
                            block.attribute.forEach(attr => {
                                if (attr.$.mapposition) {
                                    position = attr.$.mapposition;
                                }
                                if (attr.$.maprotation) {
                                    rotation = parseInt(attr.$.maprotation);
                                }
                                if (attr.$.tile_type) {
                                    tileType = attr.$.tile_type;
                                }
                                if (attr.$.tile) {
                                    tileName = attr.$.tile;
                                }
                                if (attr.$.image) {
                                    image = attr.$.image;
                                }
                            });
                        }
                        
                        // Check if this object is actually enchanted
                        // Look for the enchanted AttributeBlock and check if it has actual enchantment data
                        if (obj.AttributeBlock) {
                            obj.AttributeBlock.forEach(enchantedBlock => {
                                if (enchantedBlock.$.blockName === 'enchanted') {
                                    // Check if this enchanted block has actual enchantment data (not just the definition)
                                    if (enchantedBlock.attribute && enchantedBlock.attribute.length > 0) {
                                        // Look for magic type indicators in clearings
                                        const hasMagic = enchantedBlock.attribute.some(attr => {
                                            if (!attr.$) return false;
                                            // Check for magic attributes in clearings
                                            const magicAttrs = ['clearing_1_magic', 'clearing_2_magic', 'clearing_4_magic', 'clearing_5_magic', 'clearing_6_magic'];
                                            return magicAttrs.some(magicAttr => attr.$[magicAttr] && attr.$[magicAttr] !== '');
                                        });
                                        if (hasMagic) {
                                            isEnchanted = true;
                                        }
                                    }
                                }
                            });
                        }
                        
                        if (position) {
                            mapTiles.push({
                                position: position,
                                rotation: rotation,
                                tileType: tileType,
                                tileName: tileName,
                                image: image,
                                objectName: obj.$.name || 'Unknown',
                                isEnchanted: isEnchanted
                            });
                        }
                    }
                });
            }
        });
        
        // Sort tiles by position for easier viewing
        mapTiles.sort((a, b) => {
            const [ax, ay] = a.position.split(',').map(Number);
            const [bx, by] = b.position.split(',').map(Number);
            
            if (ay !== by) return ay - by;
            return ax - bx;
        });
        
        console.log('=== MAP DATA EXTRACTION ===');
        console.log(`Found ${mapTiles.length} map tiles`);
        
        // Group tiles by type
        const tilesByType = {};
        mapTiles.forEach(tile => {
            if (!tilesByType[tile.tileType]) {
                tilesByType[tile.tileType] = [];
            }
            tilesByType[tile.tileType].push(tile);
        });
        
        console.log('\n=== TILES BY TYPE ===');
        Object.entries(tilesByType).forEach(([type, tiles]) => {
            console.log(`${type}: ${tiles.length} tiles`);
        });
        
        console.log('\n=== ALL MAP TILES ===');
        mapTiles.forEach(tile => {
            const enchantedStatus = tile.isEnchanted ? ' (Enchanted)' : '';
            console.log(`Position ${tile.position}, Rotation ${tile.rotation}, Type ${tile.tileType}, Name: ${tile.objectName}${enchantedStatus}`);
        });
        
        // Save the map data
        const mapData = {
            sessionName: xmlFile,
            tiles: mapTiles,
            tilesByType: tilesByType,
            totalTiles: mapTiles.length
        };
        
        fs.writeFileSync(outputPath, JSON.stringify(mapData, null, 2));
        console.log('\n=== MAP DATA SAVED ===');
        console.log(`Map data saved to: ${outputPath}`);
        
        return mapData;
        
    } catch (error) {
        console.error('Error parsing map data:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

parseMapData(); 