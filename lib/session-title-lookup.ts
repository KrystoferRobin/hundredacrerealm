import fs from 'fs';
import path from 'path';

export interface SessionTitleParts {
  mainTitle: string;
  subtitle: string;
}

/** Resolve display title for a parsed session folder id (UUID or legacy name). */
export function lookupSessionTitle(sessionId: string): SessionTitleParts | null {
  const globalPath = path.join(process.cwd(), 'public', 'stats', 'session_titles.json');
  if (fs.existsSync(globalPath)) {
    try {
      const titlesData = JSON.parse(fs.readFileSync(globalPath, 'utf8')) as Record<
        string,
        SessionTitleParts
      >;
      if (titlesData[sessionId]?.mainTitle) {
        return {
          mainTitle: titlesData[sessionId].mainTitle,
          subtitle: titlesData[sessionId].subtitle ?? '',
        };
      }

      // Legacy global index: keys like "sessionname_timestamp"
      const sessionName = sessionId.split('_')[0];
      for (const [titleKey, titleData] of Object.entries(titlesData)) {
        if (titleKey.split('_')[0] === sessionName && titleData?.mainTitle) {
          return {
            mainTitle: titleData.mainTitle,
            subtitle: titleData.subtitle ?? '',
          };
        }
      }
    } catch {
      /* fall through */
    }
  }

  const sessionDir = path.join(process.cwd(), 'public', 'parsed_sessions', sessionId);
  const perSessionTitles = path.join(sessionDir, 'session_titles.json');
  if (fs.existsSync(perSessionTitles)) {
    try {
      const t = JSON.parse(fs.readFileSync(perSessionTitles, 'utf8')) as SessionTitleParts;
      if (t.mainTitle) {
        return { mainTitle: t.mainTitle, subtitle: t.subtitle ?? '' };
      }
    } catch {
      /* fall through */
    }
  }

  const parsedPath = path.join(sessionDir, 'parsed_session.json');
  if (fs.existsSync(parsedPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(parsedPath, 'utf8')) as {
        sessionTitle?: string;
        sessionName?: string;
      };
      const title = parsed.sessionTitle || parsed.sessionName;
      if (title) {
        return { mainTitle: title, subtitle: '' };
      }
    } catch {
      /* fall through */
    }
  }

  const listingPath = path.join(sessionDir, 'session_listing.json');
  if (fs.existsSync(listingPath)) {
    try {
      const listing = JSON.parse(fs.readFileSync(listingPath, 'utf8')) as {
        sessionTitle?: string;
        sessionName?: string;
      };
      const title = listing.sessionTitle || listing.sessionName;
      if (title) {
        return { mainTitle: title, subtitle: '' };
      }
    } catch {
      /* fall through */
    }
  }

  return null;
}
