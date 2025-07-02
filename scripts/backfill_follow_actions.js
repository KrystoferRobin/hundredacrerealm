const fs = require('fs');
const path = require('path');
const { injectFollowActions, addIdleAndWaitForArrivalActions } = require('./extract_missing_data.js');

async function backfillAllSessions() {
    const sessionsDir = path.join(__dirname, '../public/parsed_sessions');
    const sessionNames = fs.readdirSync(sessionsDir).filter(name => {
        const sessionPath = path.join(sessionsDir, name);
        return fs.statSync(sessionPath).isDirectory();
    });
    let processed = 0;
    for (const sessionName of sessionNames) {
        const xmlPath = path.join(sessionsDir, sessionName, 'extracted_game.xml');
        const jsonPath = path.join(sessionsDir, sessionName, 'parsed_session.json');
        if (fs.existsSync(xmlPath) && fs.existsSync(jsonPath)) {
            console.log(`Processing session: ${sessionName}`);
            await injectFollowActions(sessionName);
            await addIdleAndWaitForArrivalActions(sessionName);
            processed++;
        } else {
            console.log(`Skipping session: ${sessionName} (missing XML or JSON)`);
        }
    }
    console.log(`\nBackfill complete. Processed ${processed} sessions.`);
}

backfillAllSessions().catch(err => {
    console.error('Error during backfill:', err);
    process.exit(1);
}); 