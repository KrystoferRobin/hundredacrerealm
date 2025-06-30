const fs = require('fs');

function main() {
  const xmlPath = 'parsed_sessions/learning-woodsgirl/extracted_game.xml';
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  
  // Look for the specific blocks we need
  console.log('Looking for _m_hist__ block...');
  const histMatch = xmlContent.match(/<AttributeBlock blockName="_m_hist__">([\s\S]*?)<\/AttributeBlock>/);
  
  if (histMatch) {
    console.log('Found _m_hist__ block');
    console.log('Content preview:', histMatch[1].substring(0, 200));
  } else {
    console.log('_m_hist__ block not found');
  }
  
  console.log('\nLooking for _m_histd__ block...');
  const histdMatch = xmlContent.match(/<AttributeBlock blockName="_m_histd__">([\s\S]*?)<\/AttributeBlock>/);
  
  if (histdMatch) {
    console.log('Found _m_histd__ block');
    console.log('Content preview:', histdMatch[1].substring(0, 200));
  } else {
    console.log('_m_histd__ block not found');
  }
  
  // Try a different approach - look for all AttributeBlocks
  console.log('\nLooking for all AttributeBlocks...');
  const allBlocks = xmlContent.match(/<AttributeBlock blockName="([^"]+)">/g);
  if (allBlocks) {
    console.log('Found', allBlocks.length, 'AttributeBlocks');
    allBlocks.slice(0, 20).forEach(block => {
      console.log('  ', block);
    });
  }
}

main(); 