export type BrandLogoKey =
  | 'capcut'
  | 'netflix'
  | 'adobe-express'
  | 'adobe-lightroom'
  | 'adobe'
  | 'alight-motion'
  | 'canva'
  | 'chatgpt'
  | 'spotify'
  | 'apple-music'
  | 'prime-video'
  | 'duolingo'
  | 'figma'
  | 'youtube'
  | 'notion'
  | 'grammarly'
  | 'ebook'
  | 'source-code'
  | 'qris'
  | 'bca'
  | 'mandiri'
  | 'bni'
  | 'bri'
  | 'gopay'
  | 'ovo'
  | 'dana'
  | 'shopeepay'
  | 'linkaja'
  | 'telkomsel'
  | 'indosat'
  | 'xl'
  | 'axis'
  | 'tri'
  | 'smartfren'
  | 'byu'
  | 'pln'
  | 'mlbb'
  | 'freefire'
  | 'valorant'
  | 'pubg'
  | 'genshin'
  | 'hok'
  | 'google-play'
  | 'steam'
  | 'apple'
  | 'roblox'
  | 'playstation'
  | 'indihome'
  | 'biznet'
  | 'bpjs'
  | 'pdam'
  | 'generic';

/**
 * Resolves any product brand, product title, payment method, or top-up provider string
 * into its canonical official app/brand logo key.
 */
export function resolveBrandKey(brand?: string, title?: string): BrandLogoKey {
  const haystack = `${brand ?? ''} ${title ?? ''}`.toLowerCase().trim();
  if (!haystack) return 'generic';

  // Streaming, Creative & Productivity Apps (check specific sub-brands before parent brands)
  if (haystack.includes('capcut')) return 'capcut';
  if (haystack.includes('netflix')) return 'netflix';
  if (haystack.includes('adobe express') || haystack.includes('express —')) return 'adobe-express';
  if (haystack.includes('lightroom')) return 'adobe-lightroom';
  if (haystack.includes('adobe')) return 'adobe';
  if (haystack.includes('alight motion') || haystack.includes('alight')) return 'alight-motion';
  if (haystack.includes('canva')) return 'canva';
  if (haystack.includes('chatgpt') || haystack.includes('openai')) return 'chatgpt';
  if (haystack.includes('spotify')) return 'spotify';
  if (haystack.includes('apple music')) return 'apple-music';
  if (haystack.includes('prime video') || haystack === 'prime' || haystack.startsWith('prime ')) return 'prime-video';
  if (haystack.includes('duolingo')) return 'duolingo';
  if (haystack.includes('figma')) return 'figma';
  if (haystack.includes('youtube')) return 'youtube';
  if (haystack.includes('notion')) return 'notion';
  if (haystack.includes('grammarly')) return 'grammarly';

  // Payment Methods & Indonesian E-Wallets / Banks
  if (haystack.includes('qris')) return 'qris';
  if (haystack.includes('bca')) return 'bca';
  if (haystack.includes('mandiri')) return 'mandiri';
  if (haystack.includes('bni')) return 'bni';
  if (haystack.includes('bri')) return 'bri';
  if (haystack.includes('gopay')) return 'gopay';
  if (haystack.includes('ovo')) return 'ovo';
  if (haystack.includes('dana')) return 'dana';
  if (haystack.includes('shopeepay') || haystack.includes('shopee')) return 'shopeepay';
  if (haystack.includes('linkaja')) return 'linkaja';

  // Telco, Electricity, Bills & Games
  if (haystack.includes('telkomsel')) return 'telkomsel';
  if (haystack.includes('indosat') || haystack.includes('im3')) return 'indosat';
  if (haystack.includes('xl axiata') || haystack === 'xl') return 'xl';
  if (haystack.includes('axis')) return 'axis';
  if (haystack.includes('tri (3)') || haystack === 'tri') return 'tri';
  if (haystack.includes('smartfren')) return 'smartfren';
  if (haystack.includes('by.u') || haystack.includes('byu')) return 'byu';
  if (haystack.includes('pln') || haystack.includes('token listrik')) return 'pln';
  if (haystack.includes('mobile legends') || haystack.includes('mlbb')) return 'mlbb';
  if (haystack.includes('free fire')) return 'freefire';
  if (haystack.includes('valorant')) return 'valorant';
  if (haystack.includes('pubg')) return 'pubg';
  if (haystack.includes('genshin')) return 'genshin';
  if (haystack.includes('honor of kings')) return 'hok';
  if (haystack.includes('google play')) return 'google-play';
  if (haystack.includes('steam')) return 'steam';
  if (haystack.includes('apple')) return 'apple';
  if (haystack.includes('roblox')) return 'roblox';
  if (haystack.includes('playstation')) return 'playstation';
  if (haystack.includes('indihome')) return 'indihome';
  if (haystack.includes('biznet') || haystack.includes('myrepublic') || haystack.includes('first media') || haystack.includes('cbn')) return 'biznet';
  if (haystack.includes('bpjs')) return 'bpjs';
  if (haystack.includes('pdam') || haystack.includes('pam jaya')) return 'pdam';

  // Digital asset categories
  if (haystack.includes('e-book') || haystack.includes('ebook')) return 'ebook';
  if (haystack.includes('source code') || haystack.includes('boilerplate')) return 'source-code';

  return 'generic';
}
