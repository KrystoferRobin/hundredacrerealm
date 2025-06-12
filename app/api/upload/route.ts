import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { processGameZipRecursive, parseGameData, parseLogContent, extractTopLevelXml, parseXml, diffXml, extractStructuredHtmlData } from '../../utils/zipProcessor'
import { PrismaClient } from '.prisma/client'
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'

const prisma = new PrismaClient()

// Helper to recursively find DayPageMap.jpg in extracted directory
async function findMapImageFile(dir, fs) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findMapImageFile(fullPath, fs);
      if (found) return found;
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('daypagemap.jpg')) {
      return fullPath;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const fs = await import('fs/promises');
    console.log('Received upload request')
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.error('No file provided in request')
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Check if file is a zip file
    if (!file.name.toLowerCase().endsWith('.zip')) {
      console.error('Invalid file type:', file.name)
      return NextResponse.json(
        { error: 'Only .zip files are allowed' },
        { status: 400 }
      )
    }

    console.log('Processing file:', file.name)

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Save the uploaded file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const zipPath = join(uploadsDir, file.name)
    await writeFile(zipPath, buffer)
    console.log('File saved to:', zipPath)

    // Process the zip file recursively
    const gameDir = join(uploadsDir, file.name.replace('.zip', ''))
    console.log('Extracting to:', gameDir)
    const structure = await processGameZipRecursive(zipPath, gameDir)
    console.log('Zip processed recursively')

    // Handle images: deduplicate by hash, store unique images in /public/images/gamelogs
    const imagesDir = join(process.cwd(), 'public', 'images', 'gamelogs')
    mkdirSync(imagesDir, { recursive: true })
    const imageHashMap: Record<string, string> = {}
    for (const img of structure.images) {
      const destFilename = `${img.hash}${img.path.slice(img.path.lastIndexOf('.'))}`
      const destPath = join(imagesDir, destFilename)
      if (!existsSync(destPath)) {
        copyFileSync(img.path, destPath)
      }
      imageHashMap[img.path] = `/images/gamelogs/${destFilename}`
    }

    // Extract and parse the top-level XML from the uploaded zip
    const { xmlPath, xmlContent } = await extractTopLevelXml(zipPath, gameDir)
    const gameXml = parseXml(xmlContent)
    // Read and parse the canonical testing.xml
    const testingXmlContent = readFileSync(join(process.cwd(), 'testing.xml'), 'utf8')
    const testingXml = parseXml(testingXmlContent)
    // Diff the XMLs
    const xmlDiff = diffXml(gameXml, testingXml)

    // Find the index.html file to get game data
    const indexFile = structure.htmlFiles.find(f => f.type === 'index')
    if (!indexFile) {
      console.error('No index.html file found in zip')
      throw new Error('No index.html file found in zip')
    }

    // Parse game data
    console.log('Parsing game data from index.html')
    const gameData = parseGameData(indexFile.content)
    console.log('Game data parsed:', gameData)

    // Set game name to zip filename (minus .zip)
    const gameName = file.name.replace(/\.zip$/i, '')

    // Calculate total turns from Month/Day in index.html <title>
    const month = gameData.currentMonth || 1
    const day = gameData.currentDay || 1
    const totalTurns = (month - 1) * 28 + (day - 1)

    // Find the log file to get game events
    const logFile = structure.htmlFiles.find(f => f.type === 'log')
    if (!logFile) {
      console.error('No log file found in zip')
      throw new Error('No log file found in zip')
    }

    // Parse log content
    console.log('Parsing log content')
    const events = parseLogContent(logFile.content)
    console.log('Events parsed:', events.length)
    console.log('Battle events:', events.filter(e => e.type === 'BATTLE').length)
    console.log('Sample battle event:', events.find(e => e.type === 'BATTLE')?.description)

    // Fix rimraf import
    const rimraf = (await import('rimraf')).default

    // Find the map image file in the extracted directory
    const mapImagePath = await findMapImageFile(gameDir, fs);
    let mapImageWebPath = '';
    if (mapImagePath) {
      try {
        const mapsDir = join(process.cwd(), 'public', 'maps');
        await mkdir(mapsDir, { recursive: true });
        const destPath = join(mapsDir, `${gameName}.jpg`);
        await writeFile(destPath, await fs.readFile(mapImagePath));
        mapImageWebPath = `/maps/${gameName}.jpg`;
      } catch (err) {
        console.warn('Map image could not be copied:', mapImagePath);
      }
    } else {
      console.warn('Map image not found in extracted directory');
    }

    // Extract the top-level folder name from the zip for gameFile
    const topLevelFolder = structure.htmlFiles.length > 0
      ? structure.htmlFiles[0].path.split('/').find((part, idx, arr) => idx > 0 && arr[idx - 1] === 'uploads')
      : '';
    const gameFileName = topLevelFolder || '';

    // Create the game and players first (without events)
    const game = await prisma.game.create({
      data: {
        name: gameName,
        version: gameData.version,
        currentDay: gameData.currentDay,
        currentMonth: gameData.currentMonth,
        gameFile: gameFileName,
        mapImage: mapImageWebPath,
        players: {
          create: gameData.players.map(player => ({
            name: player.name,
            character: player.character,
            characterType: player.characterType,
            location: player.location
          }))
        },
        htmlFiles: {
          create: structure.htmlFiles.map(file => ({
            path: file.path,
            type: file.type
          }))
        },
        images: {
          create: structure.images.map(img => ({
            path: imageHashMap[img.path],
            type: img.type
          }))
        }
      },
      include: {
        players: true,
        htmlFiles: true,
        images: true
      }
    })
    console.log('Game created successfully')

    // Build a map from player name to player id
    const playerNameToId: Record<string, string> = {}
    for (const player of game.players) {
      playerNameToId[player.name] = player.id
      playerNameToId[player.character] = player.id // Also map by character name
    }

    // Now create events, mapping player names to IDs
    const createdEvents = await prisma.gameEvent.createMany({
      data: events.map(event => {
        let playerId: string | null = null
        if (event.player && playerNameToId[event.player]) {
          playerId = playerNameToId[event.player]
        }
        return {
          type: event.type,
          description: event.description,
          day: event.day,
          month: event.month,
          gameId: game.id,
          playerId
        }
      })
    })
    console.log('Created events:', createdEvents.count)

    // For each HTML file, extract detailed structured data and store in GameLog
    const gameLogs = await Promise.all(structure.htmlFiles.map(async (file) => {
      const structuredData = extractStructuredHtmlData(file.content)
      // Update image references in structuredData if needed (optional, depending on your extraction logic)
      return prisma.gameLog.create({
        data: {
          gameId: game.id,
          filename: file.path,
          logType: file.type,
          turnNumber: null, // Could be extracted from structuredData if available
          characterId: null, // Could be extracted from structuredData if available
          data: JSON.stringify({
            ...structuredData,
            xmlDiff
          })
        }
      })
    }))
    console.log('GameLogs created successfully')

    // Clean up: delete extracted contents and the zip file
    await new Promise<void>((resolve, reject) => {
      rimraf(gameDir, { glob: false }, err => (err ? reject(err) : resolve()));
    });
    await fs.unlink(zipPath)
    console.log('Cleaned up extracted files and zip')

    return NextResponse.json({
      message: 'Game uploaded successfully',
      game: { ...game, totalTurns }
    })
  } catch (error) {
    console.error('Error processing upload:', error)
    return NextResponse.json(
      { error: 'Error processing upload: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
} 