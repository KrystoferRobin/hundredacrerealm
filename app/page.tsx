"use client";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import JSZip from "jszip";
import { useRouter } from 'next/navigation';
import Image from "next/image";

// TypeScript interface for parsed character log
interface CharacterLog {
  character: string;
  player: string;
  gameLength: string; // e.g. '1 Month', '2 Months, 3 Days'
  portraitImg: string | null;
  chitsImg: string | null;
  stats: Record<string, string>;
  activeInventory: { name: string; img: string }[];
  inactiveInventory: { name: string; img: string }[];
  hirelings: { name: string; img: string }[];
  eventLog: {
    month: number;
    day: number;
    monsterRoll: number | null;
    actions: string;
    summary: string;
    kills: { name: string; img: string }[];
  }[];
}

// Update the CombatLogEntry type
type CombatLogEntry = {
  month: number;
  day: number;
  character: string;
  html: string;
  monsters: string[];  // List of monster names involved in the combat
};

interface InventoryItem {
  name: string;
  img: string;
}

interface EventLogEntry {
  month: number;
  day: number;
  monsterRoll: number | null;
  actions: string;
  summary: string;
  kills: { name: string; img: string }[];
}

type Character = {
  id: string;
  name: string;
  portraitImg: string;
  chitsImg: string;
  stats?: {
    fame: number;
    notoriety: number;
    curses: number;
  };
  inventory: Array<{
    id: string;
    name: string;
    img: string;
    isActive: boolean;
  }>;
  eventLog: Array<{
    id: string;
    month: number;
    day: number;
    monsterRoll: number | null;
    actions: string;
    summary: string;
    kills: Array<{
      id: string;
      name: string;
      img: string;
    }>;
  }>;
};

type Player = {
  id: string;
  name: string;
  character: Character;
};

type Game = {
  id: string;
  name: string;
  players: Player[];
  createdAt: string;
};

// Folder icon SVG for the process-local-zips button
const FolderIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h5.379c.414 0 .81.162 1.104.454l1.561 1.561c.293.293.69.454 1.104.454H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
  </svg>
);

// Sun icon SVG for the footer
const SunIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
  </svg>
);

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [logError, setLogError] = useState<string | null>(null);
  const [mapImages, setMapImages] = useState<{ name: string; url: string }[]>([]);
  const [fullDetailLog, setFullDetailLog] = useState<{ name: string; url: string } | null>(null);
  const [whiteKnightLog, setWhiteKnightLog] = useState<{ name: string; url: string } | null>(null);
  const [zipRef, setZipRef] = useState<JSZip | null>(null);
  const [inlineLogHtml, setInlineLogHtml] = useState<string | null>(null);
  const [inlineLogTitle, setInlineLogTitle] = useState<string | null>(null);
  const [parsedCharacterLog, setParsedCharacterLog] = useState<CharacterLog | null>(null);
  const [combatLogEntries, setCombatLogEntries] = useState<CombatLogEntry[]>([]);
  const [combatLogPopup, setCombatLogPopup] = useState<{ html: string; killName: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<'home' | 'characters' | 'monsters' | 'natives' | 'log' | 'games' | 'map' | 'game-logs' | 'session'>("home");
  const [selectedLogUrl, setSelectedLogUrl] = useState<string | null>(null);
  const [selectedMapSession, setSelectedMapSession] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [turnCounts, setTurnCounts] = useState<{ [sessionId: string]: number | null }>({});
  const [processingZips, setProcessingZips] = useState(false);
  const [processResult, setProcessResult] = useState<{ processed: any[]; errors: any[] } | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRecentSessions = async () => {
      try {
        const response = await fetch('/api/game-sessions');
        if (!response.ok) throw new Error('Failed to fetch recent sessions');
        const data = await response.json();
        setRecentLogs(data.slice(0, 10)); // Only show the 10 most recent
      } catch (err) {
        setError('Failed to load recent sessions.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecentSessions();
  }, []);

  // Fetch turn counts for each session
  useEffect(() => {
    async function fetchTurnsForSessions() {
      const newTurnCounts: { [sessionId: string]: number | null } = {};
      await Promise.all(recentLogs.map(async (session) => {
        if (turnCounts[session.sessionId] !== undefined) {
          newTurnCounts[session.sessionId] = turnCounts[session.sessionId];
          return;
        }
        // Turn count is already available in the session data
        newTurnCounts[session.sessionId] = session.totalTurns || 0;
      }));
      setTurnCounts((prev) => ({ ...prev, ...newTurnCounts }));
    }
    if (recentLogs.length > 0) {
      fetchTurnsForSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentLogs]);

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      setUploadSuccess(`Successfully uploaded game: ${data.gameName}`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to upload file. Please try again.");
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".zip")) {
      handleFileUpload(file);
    } else {
      setUploadError("Please upload a ZIP file");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Helper to load and show log file content
  async function showLogFile(name: string) {
    if (zipRef && zipRef.file(name)) {
      const text = await zipRef.file(name)!.async("text");
      const win = window.open();
      if (win) {
        win.document.write(text);
        win.document.close();
      }
    }
  }

  // Tile name mapping
  const tileNames: { [key: string]: string } = {
    "CL": "Cliffs",
    "CV": "Caves",
    "DV": "Deep Woods",
    "DW": "Deep Woods",
    "EV": "Evil Valley",
    "GH": "Great Hall",
    "HP": "High Pass",
    "MP": "Mountain Pass",
    "MV": "Mountain Valley",
    "NP": "Narrow Pass",
    "RV": "Ruin Valley",
    "SV": "Shore Valley",
    "WV": "Woods Valley"
  };

  // Generate summary of actions
  function generateSummary(input: string): string {
    const actions = input.split(",").map(a => a.trim());
    const result = actions.map(action => {
      // Handle double moves
      if (action.startsWith("x")) {
        const move = action.substring(1);
        if (move.startsWith("M-")) {
          const [tile, number] = move.substring(2).match(/([A-Z]+)(\d+)/)?.slice(1) || [];
          const tileName = tileNames[tile] || tile;
          return `Moved to ${tileName} ${number} (mountainous)`;
        }
        return `${move} (mountainous)`;
      }
      
      // Handle regular moves
      if (action.startsWith("M-")) {
        const [tile, number] = action.substring(2).match(/([A-Z]+)(\d+)/)?.slice(1) || [];
        const tileName = tileNames[tile] || tile;
        return `Moved to ${tileName} ${number}`;
      }
      
      // Handle other actions
      switch (action) {
        case "H": return "Hid";
        case "R": return "Rested";
        case "T": return "Traded";
        case "L": return "Looted";
        case "S": return "Searched";
        case "D": return "Ducked";
        default: return action;
      }
    });
    return result.join(", ");
  }

  // Parse character log HTML content
  async function parseCharacterLog(html: string, zip: JSZip, topLevelFolder: string | null): Promise<CharacterLog> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Character and player
    const h1 = doc.querySelector("h1");
    let character = "";
    let player = "";
    if (h1) {
      const match = h1.textContent?.match(/^(.*?) \((.*?)\)$/);
      if (match) {
        character = match[1];
        player = match[2];
      } else {
        character = h1.textContent || "";
      }
    }

    // Game length
    const title = doc.querySelector("title")?.textContent || "";
    let gameLength = "";
    const titleMatch = title.match(/Month (\d+), Day (\d+)/);
    if (titleMatch) {
      let months = parseInt(titleMatch[1], 10);
      let days = parseInt(titleMatch[2], 10);
      // Adjust for Realmspeak's extra day
      if (days === 1) months -= 1;
      if (months > 0 && days === 1) {
        gameLength = `${months} Month${months > 1 ? "s" : ""}`;
      } else if (months > 0 && days > 1) {
        gameLength = `${months - 1} Month${months - 1 !== 1 ? "s" : ""}, ${days - 1} Days`;
      } else {
        gameLength = `${days - 1} Days`;
      }
    }

    // Get character portrait
    const portraitImg = doc.querySelector("img[src*='.jpg']");
    const portraitSrc = portraitImg?.getAttribute("src") || "";
    console.log('Portrait source:', portraitSrc);
    const portraitUrl = await resolveImageFromZip(zip, portraitSrc, topLevelFolder);
    console.log('Resolved portrait URL:', portraitUrl);
    
    // Get character chits
    const chitsImg = doc.querySelector("img[src*='_chits.jpg']");
    const chitsSrc = chitsImg?.getAttribute("src") || "";
    console.log('Chits source:', chitsSrc);
    const chitsUrl = await resolveImageFromZip(zip, chitsSrc, topLevelFolder);
    console.log('Resolved chits URL:', chitsUrl);

    // Stats
    const stats: Record<string, string> = {};
    const statsTable = Array.from(doc.querySelectorAll("th")).find(th => th.textContent?.toLowerCase().includes("stats"));
    if (statsTable) {
      const statsTd = statsTable.parentElement?.parentElement?.querySelectorAll("td")[0];
      if (statsTd) {
        const statRows = statsTd.querySelectorAll("tr");
        statRows.forEach(row => {
          const tds = row.querySelectorAll("td");
          if (tds.length === 2) {
            const key = tds[0].textContent?.replace(/:$/, "").trim() || "";
            const value = tds[1].textContent?.trim() || "";
            if (['Fame', 'Notoriety', 'Curses'].includes(key)) stats[key] = value;
          }
        });
      }
    }

    // Inventory
    const allTables = Array.from(doc.querySelectorAll('table'));
    console.log('All tables found:', allTables.length);
    
    // Find the main inventory table (the one with colored headers)
    let invTable: HTMLTableElement | null = null;
    for (const table of allTables) {
      const headers = table.querySelectorAll('th');
      if (headers.length === 4 && 
          headers[0].textContent?.includes('Stats') && 
          headers[1].textContent?.includes('Active Inventory')) {
        invTable = table as HTMLTableElement;
        break;
      }
    }

    let activeInventoryImgs: HTMLImageElement[] = [];
    let inactiveInventoryImgs: HTMLImageElement[] = [];
    let hirelingsImgs: HTMLImageElement[] = [];

    if (invTable) {
      console.log('Found inventory table');
      // Get the row after the header row
      const dataRow = invTable.querySelector('tr:nth-child(2)');
      if (dataRow) {
        const cells = dataRow.querySelectorAll('td');
        console.log('Found inventory cells:', cells.length);
        
        // Active Inventory (second cell)
        if (cells[1]) {
          activeInventoryImgs = Array.from(cells[1].querySelectorAll('img'));
          console.log('Active inventory items:', activeInventoryImgs.map(img => ({
            name: img.getAttribute('alt'),
            src: img.getAttribute('src')
          })));
        }
        
        // Inactive Inventory (third cell)
        if (cells[2]) {
          inactiveInventoryImgs = Array.from(cells[2].querySelectorAll('img'));
          console.log('Inactive inventory items:', inactiveInventoryImgs.map(img => ({
            name: img.getAttribute('alt'),
            src: img.getAttribute('src')
          })));
        }
        
        // Hirelings (fourth cell)
        if (cells[3]) {
          hirelingsImgs = Array.from(cells[3].querySelectorAll('img'));
          console.log('Hireling items:', hirelingsImgs.map(img => ({
            name: img.getAttribute('alt'),
            src: img.getAttribute('src')
          })));
        }
      }
    } else {
      console.log('No inventory table found, trying direct image search');
      // Fallback: try to find inventory images directly
      activeInventoryImgs = Array.from(doc.querySelectorAll('img[src*="i"][src*=".jpg"]'));
      console.log('Found inventory images (fallback):', activeInventoryImgs.length);
    }

    // Process inventory images
    const activeInventory = await Promise.all(activeInventoryImgs.map(async img => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      console.log('Processing active inventory item:', { src, alt });
      const url = await resolveImageFromZip(zip, src, topLevelFolder);
      console.log('Resolved active inventory URL:', url);
      return { name: alt, img: url || '' };
    }));

    const inactiveInventory = await Promise.all(inactiveInventoryImgs.map(async img => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      console.log('Processing inactive inventory item:', { src, alt });
      const url = await resolveImageFromZip(zip, src, topLevelFolder);
      console.log('Resolved inactive inventory URL:', url);
      return { name: alt, img: url || '' };
    }));

    const hirelings = await Promise.all(hirelingsImgs.map(async img => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      console.log('Processing hireling:', { src, alt });
      const url = await resolveImageFromZip(zip, src, topLevelFolder);
      console.log('Resolved hireling URL:', url);
      return { name: alt, img: url || '' };
    }));
    
    console.log('Final inventory counts:', {
      active: activeInventory.length,
      inactive: inactiveInventory.length,
      hirelings: hirelings.length
    });
    console.log('Active inventory items:', activeInventory.map(item => item.name));
    console.log('Inactive inventory items:', inactiveInventory.map(item => item.name));
    
    // Event log
    const eventLog: CharacterLog["eventLog"] = [];
    const eventTable = Array.from(doc.querySelectorAll("th")).find(th => th.textContent?.toLowerCase().includes("event log"));
    if (eventTable) {
      const table = eventTable.parentElement?.parentElement as HTMLTableElement;
      if (table) {
        const rows = Array.from(table.querySelectorAll("tr")).slice(1); // skip header
        rows.forEach(row => {
          const tds = row.querySelectorAll("td");
          if (tds.length >= 6) {
            const month = parseInt(tds[0].textContent || "0", 10);
            const day = parseInt(tds[1].textContent || "0", 10);
            // Monster roll: parse dX.jpg from img src
            let monsterRoll: number | null = null;
            const mrImg = tds[2].querySelector("img");
            if (mrImg) {
              const src = mrImg.getAttribute("src") || "";
              const match = src.match(/d(\d+)\.jpg/);
              if (match) monsterRoll = parseInt(match[1], 10);
            }
            const actions = tds[3].textContent?.trim() || "";
            const summary = tds[4].textContent?.trim() || "";
            // Kills: parse all img alts and srcs
            const kills: { name: string; img: string }[] = [];
            const killImgs = tds[5].querySelectorAll("img");
            killImgs.forEach(img => {
              const name = img.getAttribute("alt") || "";
              const src = img.getAttribute("src");
              if (src) {
                kills.push({ name, img: src });
              }
            });
            eventLog.push({ month, day, monsterRoll, actions, summary, kills });
          }
        });
      }
    }
    
    return {
      character,
      player,
      gameLength,
      stats,
      portraitImg: portraitUrl || "",
      chitsImg: chitsUrl || "",
      activeInventory,
      inactiveInventory,
      hirelings,
      eventLog
    };
  }

  // Helper to resolve an image path from the ZIP and return a Blob URL
  async function resolveImageFromZip(zip: JSZip, src: string, topLevelFolder: string | null): Promise<string | null> {
    if (!src) return null;
    
    console.log('Resolving image:', src);
    console.log('Top level folder:', topLevelFolder);
    console.log('Available files:', Object.keys(zip.files));
    
    // Clean up the source path
    let filePath = src.replace(/^\.\//, ''); // Remove leading ./
    console.log('Cleaned path:', filePath);
    
    // Try different path combinations
    const possiblePaths = [
      filePath,                                    // Original path
      `${topLevelFolder}${filePath}`,             // With top level folder
      filePath.split('/').pop() || '',            // Just the filename
      `${topLevelFolder}${filePath.split('/').pop() || ''}` // Top level folder + filename
    ];

    console.log('Trying paths:', possiblePaths);

    // Try each possible path
    for (const path of possiblePaths) {
      if (zip.file(path)) {
        console.log('Found image at path:', path);
        const blob = await zip.file(path)!.async('blob');
        return URL.createObjectURL(blob);
      }
    }

    // If not found, try to find any file that ends with the same filename
    const filename = filePath.split('/').pop();
    if (filename) {
      console.log('Trying to find file ending with:', filename);
      const found = Object.keys(zip.files).find(name => name.endsWith(`/${filename}`));
      if (found) {
        console.log('Found image with matching filename:', found);
        const blob = await zip.file(found)!.async('blob');
        return URL.createObjectURL(blob);
      }
    }

    console.warn('Could not resolve image:', src);
    return null;
  }

  // Helper to load and show log file content inline
  async function showLogFileInline(name: string, title: string) {
    if (zipRef && zipRef.file(name)) {
      const text = await zipRef.file(name)!.async("text");
      if (title === 'White Knight Log') {
        // Find top-level folder for robust image lookup
        let topLevelFolder: string | null = null;
        const allFiles = Object.keys(zipRef.files);
        if (allFiles.length > 0) {
          const folders = allFiles.map(f => f.split("/")[0]).filter(f => f && !f.endsWith('.html') && !f.startsWith('__MACOSX') && !f.startsWith('._'));
          const uniqueFolders = Array.from(new Set(folders));
          if (uniqueFolders.length === 1) topLevelFolder = uniqueFolders[0];
        }
        const parsed = await parseCharacterLog(text, zipRef, topLevelFolder);
        // Resolve images for portrait, chits, inventory, kills
        parsed.portraitImg = await resolveImageFromZip(zipRef, parsed.portraitImg || '', topLevelFolder);
        parsed.chitsImg = await resolveImageFromZip(zipRef, parsed.chitsImg || '', topLevelFolder);
        for (const item of parsed.activeInventory) {
          item.img = (await resolveImageFromZip(zipRef, item.img, topLevelFolder)) || '';
        }
        for (const item of parsed.inactiveInventory) {
          item.img = (await resolveImageFromZip(zipRef, item.img, topLevelFolder)) || '';
        }
        for (const item of parsed.hirelings) {
          item.img = (await resolveImageFromZip(zipRef, item.img, topLevelFolder)) || '';
        }
        for (const row of parsed.eventLog) {
          for (const kill of row.kills) {
            kill.img = (await resolveImageFromZip(zipRef, kill.img, topLevelFolder)) || '';
          }
        }
        setInlineLogHtml(null);
        setInlineLogTitle(null);
        setParsedCharacterLog(parsed);
        return;
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      // Rewrite <img> tags to use Blob URLs
      const imgs = Array.from(doc.querySelectorAll("img"));
      for (const img of imgs) {
        let src = img.getAttribute("src");
        if (src) {
          if (src.startsWith("./")) src = src.slice(2);
          let filePath = src;
          if (!zipRef.file(filePath)) {
            // Try to find any file in the ZIP whose path ends with the requested filename
            const found = Object.keys(zipRef.files).find(
              (name) => name.endsWith(`/${src}`) || name === src
            );
            if (found) filePath = found;
          }
          if (zipRef.file(filePath)) {
            const blob = await zipRef.file(filePath)!.async("blob");
            const url = URL.createObjectURL(blob);
            img.setAttribute("src", url);
          }
        }
      }
      // Inject style for readability and theme
      const style = doc.createElement('style');
      style.innerHTML = `
        body, html, .log-theme {
          background: #f6ecd6 !important;
          color: #3a2a13 !important;
          font-family: 'EB Garamond', 'Georgia', serif !important;
          font-size: 1.1rem;
        }
        .log-theme a { color: #6b3e26 !important; text-decoration: underline; }
        .log-theme h1, .log-theme h2, .log-theme h3, .log-theme h4, .log-theme h5, .log-theme h6 {
          color: #6b3e26 !important;
          font-family: 'EB Garamond', 'Georgia', serif !important;
        }
        .log-theme table { background: #fff8e1 !important; color: #3a2a13 !important; }
        .log-theme td, .log-theme th { border: 1px solid #bfa76a !important; padding: 0.25em 0.5em; }
        .log-theme pre, .log-theme code { background: #f3e3b2 !important; color: #3a2a13 !important; }
      `;
      doc.head.appendChild(style);
      // Add a wrapper class
      const wrapper = doc.createElement('div');
      wrapper.className = 'log-theme p-2';
      while (doc.body.firstChild) wrapper.appendChild(doc.body.firstChild);
      setInlineLogHtml(wrapper.innerHTML);
      setInlineLogTitle(title);
    }
  }

  function closeInlineLog() {
    setInlineLogHtml(null);
    setInlineLogTitle(null);
  }

  // Update the parseFullDetailLog function to better handle the HTML structure
  function parseFullDetailLog(content: string): CombatLogEntry[] {
    console.log('Starting to parse Full Detail Log...');
    const entries: CombatLogEntry[] = [];

    // Split by lines, strip HTML tags from each line
    const lines = content.split(/\r?\n/)
      .map(line => line.replace(/<[^>]+>/g, '').trim())
      .filter(line => line.length > 0);
    console.log('Found', lines.length, 'lines in the document');
    console.log('First 20 lines:', lines.slice(0, 20));

    let currentEntry: Partial<CombatLogEntry> | null = null;
    let currentLog: string[] = [];
    let currentMonth = 0;
    let currentDay = 0;
    let currentCharacter = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Detect day/month
      const dayMatch = line.match(/Month (\d+), Day (\d+)/);
      if (dayMatch) {
        currentMonth = parseInt(dayMatch[1]);
        currentDay = parseInt(dayMatch[2]);
      }
      // Start of a combat section
      if (line.startsWith('RealmBattle - Battle resolving at')) {
        // Look ahead for GROUP 1 and character name
        let charName = '';
        let j = i + 1;
        while (j < lines.length && !lines[j].startsWith('RealmBattle - GROUP 1')) j++;
        if (j < lines.length && lines[j].startsWith('RealmBattle - GROUP 1')) {
          j++;
          // The next line that does NOT start with 'RealmBattle - ' is the character name
          while (j < lines.length) {
            if (lines[j] && !lines[j].startsWith('RealmBattle - ')) {
              if (lines[j].includes(' - ')) {
                charName = lines[j].split(' - ')[0];
              } else {
                charName = lines[j];
              }
              break;
            }
            j++;
          }
        }
        currentEntry = {
          month: currentMonth,
          day: currentDay,
          character: charName || currentCharacter,
          html: '',
          monsters: []
        };
        currentLog = [line];
        // Look ahead for monsters
        let k = i + 1;
        let monsters: string[] = [];
        while (k < lines.length && !lines[k].startsWith('RealmBattle - GROUP 2')) k++;
        if (k < lines.length && lines[k].startsWith('RealmBattle - GROUP 2')) {
          k++;
          while (k < lines.length && lines[k].startsWith('RealmBattle -')) {
            if (!lines[k].startsWith('RealmBattle - GROUP')) {
              monsters.push(lines[k].replace('RealmBattle - ', '').trim());
            }
            k++;
          }
        }
        currentEntry.monsters = monsters;
        continue;
      }
      // Detect character (e.g., 'White Knight - Starts turn:' or 'White Knight - ...')
      const charMatch = line.match(/^(\w[\w ]+?) - /);
      if (charMatch) {
        currentCharacter = charMatch[1];
      }
      // If we're in a combat section, accumulate lines
      if (currentEntry && currentLog.length > 0) {
        currentLog.push(line);
        // End of combat section
        if (line.includes('Presses the END combat button.') || line.includes('Combat has ended.')) {
          currentEntry.html = currentLog.join('\n');
          entries.push(currentEntry as CombatLogEntry);
          currentEntry = null;
          currentLog = [];
        }
      }
    }
    console.log('Finished parsing Full Detail Log. Found entries:', entries);
    return entries;
  }

  // Helper to find a matching combat log for a given event
  function findCombatLog(month: number, day: number, character: string): CombatLogEntry | undefined {
    console.log('Searching for combat log:', { month, day, character });
    console.log('Available combat logs:', combatLogEntries.map(e => ({ month: e.month, day: e.day, character: e.character })));
    const match = combatLogEntries.find(
      entry => entry.month === month && entry.day === day && entry.character.toLowerCase() === character.toLowerCase()
    );
    console.log('Found match:', match);
    return match;
  }

  // Add this helper function before the return statement
  function decodeHtmlEntities(text: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  // Handler for inline log viewing
  function handleViewLogInline(e: React.MouseEvent, url: string) {
    e.preventDefault();
    setSelectedLogUrl(url);
    setSelectedPage('log');
  }

  // Handler for inline map viewing
  function handleViewMapInline(e: React.MouseEvent, sessionId: string) {
    e.preventDefault();
    setSelectedMapSession(sessionId);
    setSelectedPage('map');
  }

  useEffect(() => {
    // Handler for inline log opening from iframe
    (window as any).openLogInline = (url: string) => {
      setSelectedLogUrl(url);
      setSelectedPage('log');
    };
    // Fallback: listen for postMessage
    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.type === 'openLogInline' && event.data.url) {
        setSelectedLogUrl(event.data.url);
        setSelectedPage('log');
      }
      if (event.data && event.data.type === 'closeMap') {
        setSelectedMapSession(null);
        setSelectedPage('home');
      }
    }
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we're not on the home page, go back to home
      if (selectedPage !== 'home') {
        setSelectedPage('home');
        setSelectedLogUrl(null);
        setSelectedMapSession(null);
        setSelectedSessionId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedPage]);

  // Update browser history when page changes
  useEffect(() => {
    if (selectedPage !== 'home') {
      window.history.pushState({ page: selectedPage }, '', `#${selectedPage}`);
    }
  }, [selectedPage]);

  async function handleImportSessions() {
    setProcessingZips(true);
    setProcessResult(null);
    try {
      const response = await fetch('/api/import-sessions', { method: 'POST' });
      if (!response.ok) throw new Error('Import failed');
      const data = await response.json();
      setProcessResult(data.message || 'Import complete!');
    } catch (err: any) {
      setProcessResult(err.message || 'Import failed');
    } finally {
      setProcessingZips(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6ecd6] flex flex-col font-serif">
      {/* Header */}
      <header className="bg-[#6b3e26] text-[#f6ecd6] py-5 shadow-lg border-b-4 border-[#bfa76a] relative">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#bfa76a] via-[#fff8e1] to-[#bfa76a]"></div>
        
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl md:text-4xl font-bold tracking-wide drop-shadow-lg font-serif text-[#fff8e1] relative">
              <span className="relative z-10">Hundred Acre Realm</span>
              <div className="absolute inset-0 bg-[#bfa76a] opacity-20 blur-sm rounded-lg"></div>
            </h1>
            <p className="text-sm text-[#bfa76a] mt-1 font-serif italic">A Realm of Magic & Adventure</p>
          </div>
          
          <nav className="mt-4 sm:mt-0 flex gap-6 text-lg font-semibold">
            <a 
              href="#" 
              className="hover:underline cursor-pointer px-3 py-2 rounded-lg hover:bg-[#bfa76a] hover:text-[#6b3e26] transition-all duration-200 font-serif" 
              onClick={e => { e.preventDefault(); setSelectedPage('home'); setSelectedLogUrl(null); }}
            >
              Home
            </a>
            <a 
              href="#" 
              className="hover:underline cursor-pointer px-3 py-2 rounded-lg hover:bg-[#bfa76a] hover:text-[#6b3e26] transition-all duration-200 font-serif" 
              onClick={e => { e.preventDefault(); setSelectedPage('characters'); setSelectedLogUrl(null); }}
            >
              Cast of Characters
            </a>
            <a 
              href="#" 
              className="hover:underline cursor-pointer px-3 py-2 rounded-lg hover:bg-[#bfa76a] hover:text-[#6b3e26] transition-all duration-200 font-serif" 
              onClick={e => { e.preventDefault(); setSelectedPage('monsters'); setSelectedLogUrl(null); }}
            >
              Monsters
            </a>
            <a 
              href="#" 
              className="hover:underline cursor-pointer px-3 py-2 rounded-lg hover:bg-[#bfa76a] hover:text-[#6b3e26] transition-all duration-200 font-serif" 
              onClick={e => { e.preventDefault(); setSelectedPage('natives'); setSelectedLogUrl(null); }}
            >
              Natives
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Universal inline navigation */}
        {selectedPage === 'log' && selectedLogUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
            <button onClick={() => { setSelectedLogUrl(null); setSelectedPage('home'); }} className="mb-4 px-4 py-2 bg-[#bfa76a] text-[#fff8e1] rounded shadow font-bold">Close Log</button>
            <iframe src={selectedLogUrl} className="w-full h-[70vh] border-2 border-[#bfa76a] rounded-lg shadow-lg bg-white" title="Game Log" />
          </div>
        ) : selectedPage === 'characters' ? (
          <iframe src="/characters" className="flex-1 w-full border-2 border-[#bfa76a] rounded-lg shadow-lg bg-white" title="Characters" />
        ) : selectedPage === 'monsters' ? (
          <iframe src="/monsters" className="flex-1 w-full border-2 border-[#bfa76a] rounded-lg shadow-lg bg-white" title="Monsters" />
        ) : selectedPage === 'natives' ? (
          <iframe src="/natives" className="flex-1 w-full border-2 border-[#bfa76a] rounded-lg shadow-lg bg-white" title="Natives" />
        ) : selectedPage === 'games' ? (
          <iframe src="/games" className="flex-1 w-full h-[70vh] border-2 border-[#bfa76a] rounded-lg shadow-lg bg-white" title="Game Logs" />
        ) : selectedPage === 'game-logs' ? (
          <iframe src="/game-logs" className="flex-1 w-full border-2 border-[#bfa76a] rounded-lg shadow-lg bg-white" title="Game Logs" />
        ) : selectedPage === 'session' ? (
          <iframe src={`/session/${selectedSessionId}`} className="flex-1 w-full border-2 border-[#bfa76a] rounded-lg shadow-lg bg-white" title="Game Session" />
        ) : selectedPage === 'map' ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
            <button onClick={() => { setSelectedMapSession(null); setSelectedPage('home'); }} className="mb-4 px-4 py-2 bg-[#bfa76a] text-[#fff8e1] rounded shadow font-bold">Close Map</button>
            <iframe src={`/map?session=${selectedMapSession}`} className="w-full h-[70vh] border-2 border-[#bfa76a] rounded-lg shadow-lg bg-white" title="Game Map" />
          </div>
        ) : (
          <>
            {/* Left side - Upload Area */}
            <section className="flex-1 flex flex-col items-center py-16 px-4">
              <div className="bg-[#f6ecd6] border-4 border-[#bfa76a] rounded-xl shadow-2xl max-w-2xl w-full p-8 text-center relative" 
                   style={{
                     boxShadow: '0 8px 32px rgba(191, 167, 106, 0.3), inset 0 1px 0 rgba(255, 248, 225, 0.8)',
                     background: 'linear-gradient(135deg, #f6ecd6 0%, #fff8e1 100%)'
                   }}>
                {/* Decorative corner elements */}
                <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-lg"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-lg"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-lg"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#6b3e26] rounded-br-lg"></div>
                
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[#6b3e26] font-serif relative">
                  <span className="relative z-10">All the Adventures of the Hundred Acre Realm</span>
                  <div className="absolute inset-0 bg-[#bfa76a] opacity-10 blur-sm rounded-lg"></div>
                </h2>
                <p className="text-sm text-[#4b3a1e] mb-6 font-serif italic">
                  "Oh Bother, another flock of bats!"
                </p>
                
                <div className="flex flex-col md:flex-row gap-6 justify-center mt-8">
                  <button
                    onClick={() => { setSelectedPage('game-logs'); setSelectedLogUrl(null); }}
                    className="flex-1 bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg transition-all duration-200 hover:bg-[#f3e3b2] hover:scale-105 hover:shadow-xl text-[#6b3e26] font-serif text-xl font-semibold relative overflow-hidden group"
                    style={{
                      boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    <span className="relative z-10">Game Logs</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#bfa76a] to-[#fff8e1] opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                  </button>
                </div>
                
                <div className="flex flex-row gap-6 justify-center mt-4">
                  <button
                    onClick={() => { setSelectedPage('characters'); setSelectedLogUrl(null); }}
                    className="flex-1 bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg transition-all duration-200 hover:bg-[#f3e3b2] hover:scale-105 hover:shadow-xl text-[#6b3e26] font-serif text-xl font-semibold relative overflow-hidden group"
                    style={{
                      boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    <span className="relative z-10">Cast of Characters</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#bfa76a] to-[#fff8e1] opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                  </button>
                  <button
                    onClick={() => { setSelectedPage('monsters'); setSelectedLogUrl(null); }}
                    className="flex-1 bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg transition-all duration-200 hover:bg-[#f3e3b2] hover:scale-105 hover:shadow-xl text-[#6b3e26] font-serif text-xl font-semibold relative overflow-hidden group"
                    style={{
                      boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    <span className="relative z-10">Monsters</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#bfa76a] to-[#fff8e1] opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                  </button>
                  <button
                    onClick={() => { setSelectedPage('natives'); setSelectedLogUrl(null); }}
                    className="flex-1 bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg transition-all duration-200 hover:bg-[#f3e3b2] hover:scale-105 hover:shadow-xl text-[#6b3e26] font-serif text-xl font-semibold relative overflow-hidden group"
                    style={{
                      boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    <span className="relative z-10">Natives</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#bfa76a] to-[#fff8e1] opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                  </button>
                </div>
              </div>
            </section>

            {/* Right side - Recent Games */}
            <section className="w-80 bg-[#f6ecd6] border-l-4 border-[#bfa76a] p-6 overflow-y-auto relative">
              {/* Decorative left border accent */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#bfa76a] via-[#fff8e1] to-[#bfa76a]"></div>
              
              <div className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-4 shadow-lg relative"
                   style={{
                     boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                     background: 'linear-gradient(135deg, #fff8e1 0%, #f6ecd6 100%)'
                   }}>
                {/* Decorative corner elements */}
                <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md"></div>
                <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md"></div>
                <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md"></div>
                <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md"></div>
                
                <h2 className="text-xl font-bold text-[#6b3e26] mb-4 font-serif relative">
                  <span className="relative z-10">Recent Game Sessions</span>
                  <div className="absolute inset-0 bg-[#bfa76a] opacity-10 blur-sm rounded-lg"></div>
                </h2>
                {loading ? (
                  <div className="text-center text-[#4b3a1e] font-serif italic">Loading recent sessions...</div>
                ) : error ? (
                  <div className="text-center text-red-600 font-serif">{error}</div>
                ) : recentLogs.length === 0 ? (
                  <div className="text-center text-[#4b3a1e] font-serif italic">No recent sessions found</div>
                ) : (
                  <div className="space-y-4">
                    {recentLogs.map((session) => (
                      <div key={session.id} className="mb-2 p-3 bg-[#f6ecd6] border border-[#bfa76a] rounded-md hover:bg-[#f3e3b2] transition-colors duration-200">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-[#6b3e26] font-semibold text-left truncate max-w-[60%] font-serif">
                            {session.name}
                          </div>
                          <div className="text-xs text-[#4b3a1e] font-semibold text-right whitespace-nowrap font-serif">
                            {session.totalBattles} battles
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <div className="text-xs text-[#4b3a1e] text-left font-serif">
                            {session.uniqueCharacters} chars, {session.totalActions} actions
                          </div>
                          <button
                            onClick={() => { setSelectedSessionId(session.id); setSelectedPage('session'); }}
                            className="text-[#6b3e26] hover:text-[#bfa76a] hover:underline cursor-pointer text-xs font-semibold text-right ml-2 font-serif transition-colors duration-200"
                          >
                            View Session
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#6b3e26] text-[#f6ecd6] py-3 text-sm font-serif flex items-center justify-between px-4 relative border-t-2 border-[#bfa76a]">
        {/* Far left: Folder icon button for processing local zips */}
        <div className="flex items-center">
          <button
            className="p-2 rounded hover:bg-[#bfa76a] focus:outline-none focus:ring-2 focus:ring-[#bfa76a] transition-colors"
            title="Process local zip uploads"
            aria-label="Process local zip uploads"
            onClick={handleImportSessions}
            disabled={processingZips}
          >
            <FolderIcon className="w-6 h-6 text-[#fff8e1]" />
          </button>
          {processingZips && (
            <span className="ml-2 text-xs text-[#fff8e1]">Processing...</span>
          )}
          {processResult && typeof processResult === 'object' && 'message' in processResult && (processResult as any).message && String((processResult as any).message)}
          {processResult && typeof processResult === 'object' && 'error' in processResult && (processResult as any).error && String((processResult as any).error)}
        </div>
        
        {/* Center: Credits */}
        <div className="flex-1 text-center">
          <span className="text-[#fff8e1] font-semibold">Inspired by Karim's Magic Realm redesign. Not affiliated with Avalon Hill.</span>
        </div>
        
        {/* Far right: Sun icon */}
        <div className="flex items-center">
          <SunIcon className="w-6 h-6 text-[#fff8e1]" />
        </div>
      </footer>
    </div>
  );
}
