const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'MagicRealmData.xml');
const remotePath = 'C:/Users/chris/Documents/e-Sword/realmspeak/gameData/MagicRealmData.xml';

const local = fs.readFileSync(localPath, 'utf8');
const remote = fs.readFileSync(remotePath, 'utf8');

const count = (s, re) => (s.match(re) || []).length;
const stats = (label, s) => ({
  label,
  bytes: Buffer.byteLength(s, 'utf8'),
  lines: s.split(/\n/).length,
  gameObjects: count(s, /<GameObject /g),
  attributeBlocks: count(s, /<AttributeBlock /g),
});

const ids = (s) => {
  const re = /<GameObject id="(\d+)" name="([^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(s))) out.push({ id: m[1], name: m[2] });
  return out;
};

const localObjs = ids(local);
const remoteObjs = ids(remote);
const localById = new Map(localObjs.map((o) => [o.id, o.name]));
const remoteById = new Map(remoteObjs.map((o) => [o.id, o.name]));

const onlyRemote = remoteObjs.filter((o) => !localById.has(o.id));
const onlyLocal = localObjs.filter((o) => !remoteById.has(o.id));
const renamed = remoteObjs.filter(
  (o) => localById.has(o.id) && localById.get(o.id) !== o.name
);

console.log(JSON.stringify({ local: stats('local', local), realmspeak: stats('realmspeak', remote) }, null, 2));
console.log('\nOnly in RealmSpeak:', onlyRemote.length, onlyRemote.slice(0, 20));
console.log('\nOnly in local:', onlyLocal.length, onlyLocal.slice(0, 20));
console.log('\nSame id, different name:', renamed.length, renamed.slice(0, 20));
