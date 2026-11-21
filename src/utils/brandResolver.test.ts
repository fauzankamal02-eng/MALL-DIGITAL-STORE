import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBrandKey } from './brandResolver.ts';

test('resolveBrandKey maps all primary storefront apps to their exact official logo keys', () => {
  assert.equal(resolveBrandKey('CapCut', 'CapCut Pro 1 Bulan Private'), 'capcut');
  assert.equal(resolveBrandKey('Netflix', 'NETFLIX 1 BULAN ANTILIMIT'), 'netflix');
  assert.equal(resolveBrandKey('Adobe', 'Adobe Express — 4 Bulan'), 'adobe-express');
  assert.equal(resolveBrandKey('Adobe', 'Adobe Lightroom — 1 Tahun'), 'adobe-lightroom');
  assert.equal(resolveBrandKey('Adobe'), 'adobe');
  assert.equal(resolveBrandKey('Alight Motion'), 'alight-motion');
  assert.equal(resolveBrandKey('Canva', 'Canva Pro 3 Bulan Invite'), 'canva');
  assert.equal(resolveBrandKey('ChatGPT', 'ChatGPT GO Sharing — 3 Bulan NOGAR'), 'chatgpt');
  assert.equal(resolveBrandKey('Spotify', 'Spotify 1 Bulan Bergaransi'), 'spotify');
  assert.equal(resolveBrandKey('Apple Music', 'Apple Music Android — 1 Bulan'), 'apple-music');
  assert.equal(resolveBrandKey('Prime Video', 'Prime Video — Private 1 Bulan'), 'prime-video');
  assert.equal(resolveBrandKey('Duolingo', 'Duolingo Super Sharing — 1 Bulan'), 'duolingo');
  assert.equal(resolveBrandKey('Figma', 'Nusantara Design System — UI Kit Figma Pro'), 'figma');
});

test('resolveBrandKey maps Indonesian payment gateways, e-wallets, telcos, and games', () => {
  assert.equal(resolveBrandKey('QRIS Nasional'), 'qris');
  assert.equal(resolveBrandKey('BCA Virtual Account'), 'bca');
  assert.equal(resolveBrandKey('GoPay'), 'gopay');
  assert.equal(resolveBrandKey('DANA'), 'dana');
  assert.equal(resolveBrandKey('OVO'), 'ovo');
  assert.equal(resolveBrandKey('ShopeePay'), 'shopeepay');
  assert.equal(resolveBrandKey('Telkomsel'), 'telkomsel');
  assert.equal(resolveBrandKey('Token Listrik Prabayar'), 'pln');
  assert.equal(resolveBrandKey('Valorant'), 'valorant');
  assert.equal(resolveBrandKey('Google Play IDR'), 'google-play');
  assert.equal(resolveBrandKey('Steam Wallet IDR'), 'steam');
  assert.equal(resolveBrandKey('PlayStation Store ID'), 'playstation');
});
