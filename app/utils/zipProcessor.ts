import AdmZip from 'adm-zip'
import { join } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { parse, HTMLElement, TextNode, Node } from 'node-html-parser'
import { readFileSync } from 'fs'
import { XMLParser } from 'fast-xml-parser'
import { createHash } from 'crypto'
import { readdirSync, statSync, readFileSync as fsReadFileSync } from 'fs'

interface GameFileStructure {
  gameFile: string
  htmlFiles: {
    path: string
    type: string
    content: string
  }[]
  images: {
    path: string
    type: string
  }[]
}

interface ParsedGameData {
  name: string
  version: string
  currentDay: number
  currentMonth: number
  players: {
    name: string
    character: string
    characterType: string
    location: string
  }[]
}

export async function processGameZip(zipPath: string, outputDir: string): Promise<GameFileStructure> {
  const zip = AdmZip(zipPath)
  const entries = zip.getEntries()
  
  // Filter out macOS specific files
  const validEntries = entries.filter(entry => 
    !entry.entryName.startsWith('__MACOSX/') && 
    !entry.entryName.includes('.DS_Store')
  )

  const structure: GameFileStructure = {
    gameFile: '',
    htmlFiles: [],
    images: []
  }

  // Create output directory if it doesn't exist
  await mkdir(outputDir, { recursive: true })

  for (const entry of validEntries) {
    const entryPath = join(outputDir, entry.entryName)
    
    // Extract the file
    zip.extractEntryTo(entry, outputDir, false, true)

    // Categorize the file
    if (entry.entryName.endsWith('.rsgame')) {
      structure.gameFile = entryPath
    } else if (entry.entryName.endsWith('.html')) {
      const content = entry.getData().toString('utf8')
      const type = determineHtmlType(entry.entryName, content)
      structure.htmlFiles.push({
        path: entryPath,
        type,
        content
      })
    } else if (entry.entryName.match(/\.(png|jpg|jpeg|gif)$/i)) {
      const type = determineImageType(entry.entryName)
      structure.images.push({
        path: entryPath,
        type
      })
    }
  }

  return structure
}

function determineHtmlType(filename: string, content: string): string {
  if (filename.includes('index.html')) return 'index'
  if (filename.includes('LogPage.html')) return 'log'
  if (filename.includes('MapPage.html')) return 'map'
  if (filename.includes('RuleSummary.html')) return 'rules'
  if (filename.includes('characters/')) return 'character'
  if (filename.includes('clearings/')) return 'clearing'
  if (filename.includes('SetupCard')) return 'setup'
  return 'other'
}

function determineImageType(filename: string): string {
  if (filename.includes('DayPageMap.jpg')) return 'map'
  if (filename.includes('characters/')) return 'character'
  if (filename.includes('clearings/')) return 'clearing'
  if (filename.includes('SetupCard')) return 'setup'
  return 'other'
}

export function parseGameData(htmlContent: string): ParsedGameData {
  const root = parse(htmlContent)
  const title = root.querySelector('title')?.text || ''
  const version = root.querySelector('i')?.text.match(/Version ([\d.]+)/)?.[1] || ''

  // Extract game name and current day/month from title
  const titleMatch = title.match(/Month (\d+), Day (\d+)/)
  const currentMonth = titleMatch ? parseInt(titleMatch[1]) : 1
  const currentDay = titleMatch ? parseInt(titleMatch[2]) : 1

  // Extract player information
  const players: ParsedGameData['players'] = []
  const playerRows = root.querySelectorAll('table tr')
  
  for (const row of playerRows) {
    const nameCell = row.querySelector('td[bgcolor="#cccccc"]')
    const infoCell = row.querySelector('td:not([bgcolor])')
    
    if (nameCell && infoCell) {
      const name = nameCell.text.trim()
      const characterLink = infoCell.querySelector('a')
      const characterInfo = characterLink?.text.split(' - ')[0] || ''
      const locationMatch = infoCell.text.match(/From .* to (.*) \(\d+ days\)/)
      
      players.push({
        name,
        character: characterInfo,
        characterType: characterInfo.split(' ')[0], // e.g., "Witch" from "Witch King"
        location: locationMatch ? locationMatch[1] : ''
      })
    }
  }

  return {
    name: title,
    version,
    currentDay,
    currentMonth,
    players
  }
}

export function parseLogContent(htmlContent: string) {
  const root = parse(htmlContent)
  const events: {
    type: string
    description: string
    day: number
    month: number
    player?: string
  }[] = []

  let currentDay = 1
  let currentMonth = 1
  let currentBattle: string[] = []
  let inBattle = false

  // For grouping character actions by day
  let currentActionDay = 1
  let currentActionMonth = 1
  let actionsByCharacter: Record<string, string[]> = {}

  console.log('Starting to parse log content...')
  console.log('HTML content length:', htmlContent.length)

  // Find all <br> tags
  const brs = root.querySelectorAll('br')
  console.log('Found <br> tags:', brs.length)

  const extractedLines: string[] = [];

  brs.forEach(br => {
    let line = '';
    const parent = br.parentNode as HTMLElement;
    if (!parent) return;
    const siblings = parent.childNodes;
    const startIdx = siblings.indexOf(br);
    // Collect all nodes after this <br> up to the next <br>
    for (let i = startIdx + 1; i < siblings.length; i++) {
      const node = siblings[i];
      if (node instanceof HTMLElement && node.tagName && node.tagName.toLowerCase() === 'br') {
        break;
      }
      if (node instanceof TextNode) {
        line += node.rawText;
      } else if (node instanceof HTMLElement) {
        line += node.textContent || '';
      }
    }
    line = line.replace(/&nbsp;|\u00a0|\xa0/g, ' ').replace(/\s+/g, ' ').trim();
    if (line) extractedLines.push(line);
  });

  // Debug: print the first 10 extracted lines
  console.log('First 10 extracted log lines:', extractedLines.slice(0, 10))

  function flushActions() {
    // Push grouped actions for each character for the current day
    for (const [player, actions] of Object.entries(actionsByCharacter)) {
      if (actions.length > 0) {
        events.push({
          type: 'ACTION',
          description: actions.join(' | '), // Combine actions with separator
          day: currentActionDay,
          month: currentActionMonth,
          player
        })
      }
    }
    actionsByCharacter = {}
  }

  extractedLines.forEach(text => {
    // Update current day/month
    const dayMatch = text.match(/Month (\d+), Day (\d+)/)
    if (dayMatch) {
      // New day: flush previous day's actions
      flushActions()
      currentMonth = parseInt(dayMatch[1])
      currentDay = parseInt(dayMatch[2])
      currentActionMonth = currentMonth
      currentActionDay = currentDay
      return
    }

    // Handle battle events
    if (text.includes('RealmBattle - Battle resolving at')) {
      flushActions() // Flush actions before starting a battle
      inBattle = true
      currentBattle = [text]
    } else if (inBattle) {
      currentBattle.push(text)
      // End of battle: look for "Combat has ended." or "Presses the END combat button."
      if (text.includes('Combat has ended.') || text.includes('Presses the END combat button.')) {
        events.push({
          type: 'BATTLE',
          description: currentBattle.join('\n'),
          day: currentDay,
          month: currentMonth
        })
        inBattle = false
        currentBattle = []
      }
    } else if (text.includes(' - ')) {
      // Character action
      const [player, action] = text.split(' - ')
      const cleanPlayer = player.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (!actionsByCharacter[cleanPlayer]) actionsByCharacter[cleanPlayer] = []
      actionsByCharacter[cleanPlayer].push(action)
    } else if (text.includes('RealmSpeak')) {
      // Only add system events if they're not empty or just "RealmSpeak"
      const description = text.replace('RealmSpeak - ', '').trim()
      if (description && description !== 'RealmSpeak') {
        events.push({
          type: 'SYSTEM',
          description,
          day: currentDay,
          month: currentMonth
        })
      }
    }
  })

  // Handle any remaining battle
  if (inBattle && currentBattle.length > 0) {
    events.push({
      type: 'BATTLE',
      description: currentBattle.join('\n'),
      day: currentDay,
      month: currentMonth
    })
  }

  // Flush any remaining actions for the last day
  flushActions()

  console.log('Finished parsing log content. Found', events.length, 'events')
  console.log('Battle events:', events.filter(e => e.type === 'BATTLE').length)
  if (events.length > 0) {
    console.log('First event:', events[0])
  }
  
  return events
}

export async function extractTopLevelXml(zipPath: string, outputDir: string): Promise<{ xmlPath: string, xmlContent: string }> {
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()
  const xmlEntry = entries.find(entry => entry.entryName.endsWith('.xml'))
  if (!xmlEntry) throw new Error('No top-level XML file found in zip')
  const xmlPath = join(outputDir, xmlEntry.entryName)
  zip.extractEntryTo(xmlEntry, outputDir, false, true)
  const xmlContent = xmlEntry.getData().toString('utf8')
  return { xmlPath, xmlContent }
}

export function parseXml(xmlContent: string) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
  return parser.parse(xmlContent)
}

export function diffXml(gameXml: any, testingXml: any) {
  // Simple diff: return keys/values in gameXml that differ from testingXml
  // (This can be made more sophisticated as needed)
  const diffs: any = {}
  function recurse(a: any, b: any, path: string[] = []) {
    if (typeof a !== typeof b) {
      diffs[path.join('.')] = { game: a, testing: b }
      return
    }
    if (typeof a === 'object' && a && b) {
      const allKeys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
      for (const key of allKeys) {
        recurse(a[key], b[key], [...path, key])
      }
    } else if (a !== b) {
      diffs[path.join('.')] = { game: a, testing: b }
    }
  }
  recurse(gameXml, testingXml)
  return diffs
}

export function extractStructuredHtmlData(htmlContent: string) {
  // Placeholder: parse the HTML and extract structured data as needed
  // This should be expanded to extract turns, actions, inventory, etc.
  const root = parse(htmlContent)
  // Example: extract all tables as arrays of rows/cells
  const tables = root.querySelectorAll('table').map(table =>
    table.querySelectorAll('tr').map(row =>
      row.querySelectorAll('td').map(cell => cell.text.trim())
    )
  )
  // Example: extract all text content
  const text = root.text.trim()
  return { tables, text }
}

// Recursively collect all files of given extensions from a directory
export function collectFilesRecursive(dir: string, exts: string[]): string[] {
  let results: string[] = []
  const list = readdirSync(dir)
  for (const file of list) {
    const filePath = join(dir, file)
    const stat = statSync(filePath)
    if (stat && stat.isDirectory()) {
      results = results.concat(collectFilesRecursive(filePath, exts))
    } else if (exts.some(ext => filePath.toLowerCase().endsWith(ext))) {
      results.push(filePath)
    }
  }
  return results
}

// Hash an image file for deduplication
export function hashFile(filePath: string): string {
  const fileBuffer = fsReadFileSync(filePath)
  const hashSum = createHash('sha256')
  hashSum.update(fileBuffer)
  return hashSum.digest('hex')
}

// Main function to process all HTML and image files recursively
export async function processGameZipRecursive(zipPath: string, outputDir: string) {
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()

  // Filter out macOS specific files
  const validEntries = entries.filter(entry =>
    !entry.entryName.startsWith('__MACOSX/') &&
    !entry.entryName.includes('.DS_Store')
  )

  // Extract all files
  await mkdir(outputDir, { recursive: true })
  for (const entry of validEntries) {
    zip.extractEntryTo(entry, outputDir, false, true)
  }

  // Recursively collect all HTML and image files
  const htmlFiles = collectFilesRecursive(outputDir, ['.html'])
  const imageFiles = collectFilesRecursive(outputDir, ['.png', '.jpg', '.jpeg', '.gif'])

  // Read HTML file contents
  const htmlFileObjs = htmlFiles.map(path => ({
    path,
    type: determineHtmlType(path, ''),
    content: fsReadFileSync(path, 'utf8')
  }))

  // Prepare image file info (hash for deduplication)
  const imageFileObjs = imageFiles.map(path => ({
    path,
    type: determineImageType(path),
    hash: hashFile(path)
  }))

  return {
    htmlFiles: htmlFileObjs,
    images: imageFileObjs
  }
} 