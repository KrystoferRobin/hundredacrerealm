const fs = require('fs');
const xml2js = require('xml2js');

async function extractMapLocations(xmlPath, outputPath) {
    try {
        // Read the XML file
        const xmlData = fs.readFileSync(xmlPath, 'utf8');
        
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
                let dwelling = null;
                
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
                        if ('dwelling' in attr.$) {
                            objectType = 'dwelling';
                            dwelling = attr.$['dwelling'];
                        }
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
                        dwelling,
                        clearing,
                        tileType
                    };
                }
            }
        });
        
        // Create organized mapping by category
        const mapData = {
            dwellings: [],
            sound: [],
            warning: [],
            treasure: [],
            other: []
        };
        
        Object.values(tiles).forEach(tile => {
            if (!tile.name) return; // Only require a valid tile name
            
            tile.contains.forEach(containedId => {
                const containedObject = objects[containedId];
                if (!containedObject) return;
                
                const item = {
                    name: containedObject.name,
                    id: containedObject.id,
                    type: containedObject.type,
                    dwelling: containedObject.dwelling,
                    clearing: containedObject.clearing,
                    tile: tile.name,
                    position: tile.mapPosition,
                    rotation: tile.mapRotation
                };
                
                // Categorize the item
                if (containedObject.type === 'dwelling' || containedObject.dwelling) {
                    mapData.dwellings.push(item);
                } else if (containedObject.type === 'warning') {
                    mapData.warning.push(item);
                } else if (containedObject.type === 'treasure') {
                    mapData.treasure.push(item);
                } else if (containedObject.name && (
                    containedObject.name.includes('Howl') ||
                    containedObject.name.includes('Patter') ||
                    containedObject.name.includes('Flutter') ||
                    containedObject.name.includes('Slither') ||
                    containedObject.name.includes('Roar')
                )) {
                    mapData.sound.push(item);
                } else {
                    mapData.other.push(item);
                }
            });
        });
        
        // Filter out any items with undefined tile names
        Object.keys(mapData).forEach(category => {
            mapData[category] = mapData[category].filter(item => item.tile && item.tile !== 'undefined');
        });
        
        // Save the organized data
        fs.writeFileSync(outputPath, JSON.stringify(mapData, null, 2));
        
        // Display summary
        console.log('Map Location Extraction Complete');
        console.log('================================');
        console.log(`Dwellings: ${mapData.dwellings.length}`);
        console.log(`Sound: ${mapData.sound.length}`);
        console.log(`Warning: ${mapData.warning.length}`);
        console.log(`Treasure: ${mapData.treasure.length}`);
        console.log(`Other: ${mapData.other.length}`);
        console.log(`\nData saved to: ${outputPath}`);
        
        // Show sample of each category
        console.log('\nSample Dwellings:');
        mapData.dwellings.slice(0, 5).forEach(item => {
            const clearingInfo = item.clearing ? ` (clearing ${item.clearing})` : '';
            console.log(`  - ${item.name}: ${item.tile}${clearingInfo}`);
        });
        
        console.log('\nSample Sound:');
        mapData.sound.slice(0, 5).forEach(item => {
            const clearingInfo = item.clearing ? ` (clearing ${item.clearing})` : '';
            console.log(`  - ${item.name}: ${item.tile}${clearingInfo}`);
        });
        
        console.log('\nSample Warning:');
        mapData.warning.slice(0, 5).forEach(item => {
            console.log(`  - ${item.name}: ${item.tile}`);
        });
        
        console.log('\nSample Treasure:');
        mapData.treasure.slice(0, 5).forEach(item => {
            const clearingInfo = item.clearing ? ` (clearing ${item.clearing})` : '';
            console.log(`  - ${item.name}: ${item.tile}${clearingInfo}`);
        });
        
        return mapData;
        
    } catch (error) {
        console.error('Error:', error);
    }
}

module.exports = { extractMapLocations }; 