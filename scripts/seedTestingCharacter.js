const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTestingCharacter() {
  try {
    // Fetch all items from the database
    const allItems = await prisma.item.findMany();
    if (!allItems.length) {
      console.error('No items found in the database. Please seed items first.');
      return;
    }

    // Fetch the Amazon character to use as a template
    const amazon = await prisma.character.findUnique({
      where: { name: 'Amazon' },
    });

    if (!amazon) {
      console.error('Amazon character not found. Please seed characters first.');
      return;
    }

    // Check if the Testing character already exists
    const existingTesting = await prisma.character.findUnique({
      where: { name: 'Testing' },
    });

    if (existingTesting) {
      // Update the existing Testing character
      const updatedTesting = await prisma.character.update({
        where: { name: 'Testing' },
        data: {
          strength: amazon.strength,
          craft: amazon.craft,
          life: amazon.life,
          gold: amazon.gold,
          notoriety: amazon.notoriety,
          fame: amazon.fame,
          startingItems: JSON.stringify(allItems.map(item => item.name)),
        },
      });
      console.log('Testing character updated with all items as starting items:', updatedTesting);
    } else {
      // Create a new character named 'Testing' using Amazon's data
      const testingCharacter = await prisma.character.create({
        data: {
          name: 'Testing',
          slug: 'testing',
          strength: amazon.strength,
          craft: amazon.craft,
          life: amazon.life,
          gold: amazon.gold,
          notoriety: amazon.notoriety,
          fame: amazon.fame,
          startingItems: JSON.stringify(allItems.map(item => item.name)),
        },
      });
      console.log('Testing character created with all items as starting items:', testingCharacter);
    }
  } catch (error) {
    console.error('Error seeding Testing character:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestingCharacter(); 