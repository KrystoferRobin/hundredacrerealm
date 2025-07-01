const fs = require('fs');
const xml2js = require('xml2js');

async function extractLocationMapping() {
    try {
        // Read the XML file
        const xmlData = fs.readFileSync('parsed_sessions/5man/extracted_game.xml', 'utf8');
        
        // Parse XML
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);
        
        const gameObjects = result.game.objects[0].GameObject;
        
        // Extract tile information
        const tiles = {};
        const objects = {};
        
        gameObjects.forEach((obj) => {
            if (!obj || !obj.$ || !obj.$.name) return;
            
            const name = obj.$.name;
            const id = obj.$.id;
            
            // Store all objects by ID for lookup
            objects[id] = {
                name,
                id,
                type: null,
                clearing: null,
                tileType: null
            };
            
            // Extract tile information
            if (obj.AttributeBlock) {
                const attributeBlocks = Array.isArray(obj.AttributeBlock) ? obj.AttributeBlock : [obj.AttributeBlock];
                
                let tileType = null;
                let mapPosition = null;
                let mapRotation = null;
                let clearing = null;
                let objectType = null;
                
                attributeBlocks.forEach(block => {
                    if (!block || !block.$ || !block.$.blockName) return;
                    if (!block.attribute) return;
                    
                    const attributes = Array.isArray(block.attribute) ? block.attribute : [block.attribute];
                    
                    attributes.forEach(attr => {
                        if (!attr || !attr.$) return;
                        
                        // Tile attributes
                        if ('tile_type' in attr.$) tileType = attr.$['tile_type'];
                        if ('mapposition' in attr.$) mapPosition = attr.$['mapposition'];
                        if ('maprotation' in attr.$) mapRotation = attr.$['maprotation'];
                        
                        // Object attributes
                        if ('clearing' in attr.$) clearing = attr.$['clearing'];
                        if ('monster' in attr.$) objectType = 'monster';
                        if ('dwelling' in attr.$) objectType = 'dwelling';
                        if ('treasure_location' in attr.$) objectType = 'treasure';
                        if ('native' in attr.$) objectType = 'native';
                        if ('warning' in attr.$) objectType = 'warning';
                    });
                });
                
                // Store tile information
                if (tileType) {
                    tiles[id] = {
                        name,
                        tileType,
                        mapPosition,
                        mapRotation,
                        contains: obj.contains ? obj.contains.map(c => c.$.id) : []
                    };
                }
                
                // Store object information
                if (clearing || objectType) {
                    objects[id] = {
                        name,
                        id,
                        type: objectType,
                        clearing,
                        tileType
                    };
                }
            }
        });
        
        // Create mapping by tracing tile contents
        const tileContents = {};
        
        Object.values(tiles).forEach(tile => {
            const contents = [];
            
            tile.contains.forEach(containedId => {
                const containedObject = objects[containedId];
                if (containedObject) {
                    contents.push({
                        name: containedObject.name,
                        id: containedObject.id,
                        type: containedObject.type,
                        clearing: containedObject.clearing
                    });
                }
            });
            
            if (contents.length > 0) {
                tileContents[tile.name] = {
                    tile: tile.name,
                    position: tile.mapPosition,
                    rotation: tile.mapRotation,
                    contents
                };
            }
        });
        
        // Show results
        console.log('Tile Contents for 5man Session:');
        console.log('================================');
        
        Object.values(tileContents).forEach(tile => {
            console.log(`\n${tile.tile} (position: ${tile.position}, rotation: ${tile.rotation}):`);
            
            // Group by type
            const byType = {};
            tile.contents.forEach(item => {
                if (!byType[item.type || 'unknown']) byType[item.type || 'unknown'] = [];
                byType[item.type || 'unknown'].push(item);
            });
            
            Object.entries(byType).forEach(([type, items]) => {
                console.log(`  ${type}:`);
                items.forEach(item => {
                    const clearingInfo = item.clearing ? ` (clearing ${item.clearing})` : '';
                    console.log(`    - ${item.name}${clearingInfo}`);
                });
            });
        });
        
        // Show specific locations you mentioned
        console.log('\n\nKey Locations:');
        console.log('==============');
        
        const keyLocations = ['House', 'Inn', 'Pool', 'Hoard', 'Cairns', 'Vault', 'Chapel', 'Guard'];
        
        Object.values(tileContents).forEach(tile => {
            tile.contents.forEach(item => {
                if (keyLocations.includes(item.name)) {
                    const clearingInfo = item.clearing ? ` (clearing ${item.clearing})` : '';
                    console.log(`${item.name}: ${tile.tile}${clearingInfo}`);
                }
            });
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

extractLocationMapping(); 