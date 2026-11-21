import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const blueprint = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8'));

test('firestore.rules enforces global default-deny catch-all at top', () => {
  assert.match(rulesContent, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('every collection in firebase-blueprint.json has an explicit match block', () => {
  const paths = Object.keys(blueprint.firestore);
  for (const colPath of paths) {
    const cleanMatch = `match ${colPath}`;
    assert.ok(rulesContent.includes(cleanMatch), `Missing match block for ${colPath}`);
  }
});

test('firestore.rules prevents unverified email admin spoofing', () => {
  assert.ok(rulesContent.includes('request.auth.token.email_verified == true'));
  assert.ok(rulesContent.includes('function isBootstrapAdmin()'));
});

test('firestore.rules has zero blanket isSignedIn list reads and zero DB reads inside allow list', () => {
  const listLines = rulesContent
    .split('\n')
    .filter((line) => line.trim().startsWith('allow list:'));
  assert.ok(listLines.length >= 9, 'Expected list rules for all 9 collections');
  for (const line of listLines) {
    assert.ok(!/allow list:\s*if\s*isSignedIn\(\);/.test(line), `Blanket list read detected: ${line}`);
    assert.ok(!line.includes('get(') && !line.includes('exists(') && !line.includes('isAdmin()'), `DB lookup inside allow list detected: ${line}`);
  }
});

test('firestore.rules validates all Dirty Dozen security invariants', () => {
  assert.ok(rulesContent.includes("incoming().role in ['customer', 'seller'] || isAdmin()"), 'Self-admin escalation guard missing');
  assert.ok(rulesContent.includes('data.keys().hasOnly('), 'Shadow field guard missing');
  assert.ok(rulesContent.includes("incoming().paymentStatus == 'pending'"), 'Order state shortcutting guard missing');
  assert.ok(rulesContent.includes('exists(/databases/$(database)/documents/products/$(incoming().productId))'), 'Orphan order guard missing');
  assert.ok(rulesContent.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"), 'Path variable regex guard missing');
  assert.ok(rulesContent.includes('incoming().createdAt == request.time'), 'Temporal integrity guard missing');
  assert.ok(rulesContent.includes('allow update, delete: if false;'), 'Immutable audit/backup log guard missing');
});
