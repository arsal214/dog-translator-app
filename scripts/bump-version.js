// Bumps the app version in app.json and package.json before a store build: patch by default (1.0.0 → 1.0.1),
// or pass "minor" / "major". The build number is bumped separately by EAS (autoIncrement in eas.json).
const fs = require('fs');
const path = require('path');

const part = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major'].includes(part)) throw new Error(`Unknown part "${part}" (use patch, minor or major)`);

const root = path.join(__dirname, '..');
const appPath = path.join(root, 'app.json');
const pkgPath = path.join(root, 'package.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

let [major, minor, patch] = app.expo.version.split('.').map(Number);
if (part === 'major') [major, minor, patch] = [major + 1, 0, 0];
else if (part === 'minor') [minor, patch] = [minor + 1, 0];
else patch += 1;
const next = `${major}.${minor}.${patch}`;

app.expo.version = next;
pkg.version = next;
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n');
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version bumped to ${next}`);
