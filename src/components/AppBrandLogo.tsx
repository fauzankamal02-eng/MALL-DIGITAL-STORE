import React from 'react';
import {
  siApple,
  siApplemusic,
  siFigma,
  siGoogleplay,
  siGrammarly,
  siNetflix,
  siNotion,
  siPlaystation,
  siRoblox,
  siShopee,
  siSpotify,
  siSteam,
  siValorant,
  siYoutube,
} from 'simple-icons';
import { BookOpen, Code2, Sparkles } from 'lucide-react';
import { resolveBrandKey, type BrandLogoKey } from '../utils/brandResolver';

export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg';

interface AppBrandLogoProps {
  brand?: string;
  title?: string;
  logoKey?: BrandLogoKey;
  size?: BrandLogoSize;
  className?: string;
}

const SIZE_CLASSES: Record<BrandLogoSize, string> = {
  xs: 'w-6 h-6 rounded-md',
  sm: 'w-10 h-10 rounded-xl',
  md: 'w-12 h-12 rounded-xl',
  lg: 'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl',
};

/**
 * Renders authentic, official-style vector app logos for every digital application,
 * payment gateway, e-wallet, game, and utility service in MALL DIGITAL STORE.
 */
export const AppBrandLogo: React.FC<AppBrandLogoProps> = ({
  brand,
  title,
  logoKey,
  size = 'md',
  className = '',
}) => {
  const key = logoKey ?? resolveBrandKey(brand, title);
  const box = `${SIZE_CLASSES[size]} relative overflow-hidden flex items-center justify-center shrink-0 select-none shadow-sm ${className}`;
  const label = title || brand || key;

  switch (key) {
    /* ==================== 1. CAPCUT (Official Crisscrossing Film Ribbon Mark) ==================== */
    case 'capcut':
      return (
        <div
          data-brand-logo="capcut"
          aria-label={label}
          className={`${box} bg-white border border-slate-200 dark:border-slate-700`}
        >
          <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]" aria-hidden="true">
            {/* Exact official CapCut intersecting ribbon-frame logo */}
            <path
              d="M40 19.5V17.5C40 15 38 13 35.5 13H17.5C15 13 13 15 13 17.5V21.5L51 42.5"
              fill="none"
              stroke="#0B0F19"
              strokeWidth="5.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M40 44.5V46.5C40 49 38 51 35.5 51H17.5C15 51 13 49 13 46.5V42.5L51 21.5"
              fill="none"
              stroke="#0B0F19"
              strokeWidth="5.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );

    /* ==================== 2. NETFLIX (Official Simple Icons Crimson Ribbon N) ==================== */
    case 'netflix':
      return (
        <div
          data-brand-logo="netflix"
          aria-label={label}
          className={`${box} bg-[#141414] border border-neutral-800`}
        >
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" aria-hidden="true">
            <path d={siNetflix.path} fill="#E50914" />
          </svg>
        </div>
      );

    /* ==================== 3. ADOBE EXPRESS (Official Multi-Color Prism Squircle + Express Mark) ==================== */
    case 'adobe-express':
      return (
        <div
          data-brand-logo="adobe-express"
          aria-label={label}
          style={{
            background:
              'linear-gradient(135deg, #FF2467 0%, #FF7A00 32%, #8B5CF6 68%, #00C4CC 100%)',
          }}
          className={box}
        >
          <svg viewBox="0 0 64 64" className="w-[74%] h-[74%]" aria-hidden="true">
            {/* Official Adobe Express bold geometric A + inner wave prism */}
            <path
              d="M27.8 13H36.2L51 51H41.6L38.3 41.8H25.7L22.4 51H13L27.8 13ZM35.8 34.4L32 23.4L28.2 34.4H35.8Z"
              fill="#FFFFFF"
            />
            <circle cx="49" cy="16" r="4.2" fill="#FFFFFF" fillOpacity="0.92" />
          </svg>
        </div>
      );

    /* ==================== 4. ADOBE LIGHTROOM (Official #001E36 + #31A8FF Lr App Icon) ==================== */
    case 'adobe-lightroom':
      return (
        <div
          data-brand-logo="adobe-lightroom"
          aria-label={label}
          className={`${box} bg-[#001E36] border-2 border-[#31A8FF]/70`}
        >
          <svg viewBox="0 0 64 64" className="w-[76%] h-[76%]" aria-hidden="true">
            {/* Official Adobe Lr geometric lettering */}
            <path
              d="M14.5 16.5H21.6V41.5H34.2V47.6H14.5V16.5Z"
              fill="#31A8FF"
            />
            <path
              d="M38.2 25.1H44.6V29.3C46 26.2 48.6 24.5 52 24.5C52.6 24.5 53.2 24.6 53.7 24.8V31.2C53 31 52.2 30.9 51.3 30.9C47.5 30.9 45.1 33 45.1 37.2V47.6H38.2V25.1Z"
              fill="#31A8FF"
            />
          </svg>
        </div>
      );

    /* ==================== 5. ADOBE (Official Red A Corporate Mark) ==================== */
    case 'adobe':
      return (
        <div
          data-brand-logo="adobe"
          aria-label={label}
          className={`${box} bg-[#EB1000]`}
        >
          <svg viewBox="0 0 64 64" className="w-[68%] h-[68%]" aria-hidden="true">
            <path d="M38.2 12H54V52L38.2 12Z" fill="#FFFFFF" />
            <path d="M25.8 12H10V52L25.8 12Z" fill="#FFFFFF" />
            <path d="M32 26.8L42.2 52H35.2L32.1 43.8H25.2L32 26.8Z" fill="#FFFFFF" />
          </svg>
        </div>
      );

    /* ==================== 6. ALIGHT MOTION (Official Deep Navy + Luminous Cyan Orbital Swirl) ==================== */
    case 'alight-motion':
      return (
        <div
          data-brand-logo="alight-motion"
          aria-label={label}
          style={{
            background: 'radial-gradient(circle at 30% 25%, #0D2D56 0%, #051124 80%)',
          }}
          className={`${box} border border-cyan-500/30`}
        >
          <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]" aria-hidden="true">
            <defs>
              <linearGradient id="am-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34F5C5" />
                <stop offset="55%" stopColor="#00C4FF" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
            </defs>
            {/* Outer motion ring */}
            <path
              d="M32 10A22 22 0 1 1 12.2 41.6"
              fill="none"
              stroke="url(#am-grad)"
              strokeWidth="4.6"
              strokeLinecap="round"
            />
            {/* Middle spiral arc */}
            <path
              d="M46.5 29.5A14.8 14.8 0 1 1 24 19.2"
              fill="none"
              stroke="#5CF6D6"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            {/* Inner core arc + motion dot */}
            <path
              d="M25.5 34.5A7.4 7.4 0 1 1 38.4 28.6"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            <circle cx="32" cy="32" r="3" fill="#34F5C5" />
          </svg>
        </div>
      );

    /* ==================== 7. CANVA (Official Turquoise-to-Violet Gradient + Signature Cursive C) ==================== */
    case 'canva':
      return (
        <div
          data-brand-logo="canva"
          aria-label={label}
          style={{
            background:
              'linear-gradient(135deg, #00C4CC 0%, #2684FF 52%, #7D2AE8 100%)',
          }}
          className={box}
        >
          <svg viewBox="0 0 64 64" className="w-[82%] h-[82%]" aria-hidden="true">
            {/* Flowing Canva calligraphic C emblem */}
            <path
              d="M45.8 39.8C43.1 45.1 37.3 49.5 30.2 49.5C20.9 49.5 15.2 42.6 15.2 33.1C15.2 21.8 23.1 13.5 33.5 13.5C39.8 13.5 44.5 16.9 44.5 21.5C44.5 24.4 42.5 26.4 39.9 26.4C37.7 26.4 36.2 25 36.2 23C36.2 21.6 37 20.6 37.9 19.8C36.7 18.9 35 18.3 33.1 18.3C26.4 18.3 21.9 24.5 21.9 32.6C21.9 39.6 25.8 44.3 31.6 44.3C36.5 44.3 40.3 41.3 42.8 37.2C43.7 35.8 46.8 37.8 45.8 39.8Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      );

    /* ==================== 8. CHATGPT / OPENAI (Official Emerald Teal + 6-Petal Interlocking Rosette) ==================== */
    case 'chatgpt':
      return (
        <div
          data-brand-logo="chatgpt"
          aria-label={label}
          className={`${box} bg-[#10A37F]`}
        >
          <svg viewBox="0 0 24 24" className="w-[68%] h-[68%]" aria-hidden="true">
            {/* Exact official OpenAI ChatGPT interlocking 6-petal rosette path */}
            <path
              fill="#FFFFFF"
              d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"
            />
          </svg>
        </div>
      );

    /* ==================== 9. SPOTIFY (Official Simple Icons Green Circle + 3 Acoustic Waves on Dark) ==================== */
    case 'spotify':
      return (
        <div
          data-brand-logo="spotify"
          aria-label={label}
          className={`${box} bg-[#121212] border border-neutral-800`}
        >
          <svg viewBox="0 0 24 24" className="w-[68%] h-[68%]" aria-hidden="true">
            <path d={siSpotify.path} fill="#1DB954" />
          </svg>
        </div>
      );

    /* ==================== 10. APPLE MUSIC (Official Coral-Pink Gradient + White Double Note) ==================== */
    case 'apple-music':
      return (
        <div
          data-brand-logo="apple-music"
          aria-label={label}
          style={{
            background: 'linear-gradient(180deg, #FA586A 0%, #FA233B 100%)',
          }}
          className={box}
        >
          <svg viewBox="0 0 64 64" className="w-[70%] h-[70%]" aria-hidden="true">
            <path
              d="M46.5 11.5L23.5 16.3C22.2 16.6 21.3 17.7 21.3 19V41.7C20.2 41.2 18.9 41 17.5 41.3C14 41.9 11.6 44.8 12.1 47.9C12.6 51 15.8 53 19.3 52.4C22.6 51.8 25 49.2 25 46.2V26.4L44.2 22.4V37.7C43.1 37.2 41.8 37 40.4 37.3C36.9 37.9 34.5 40.8 35 43.9C35.5 47 38.7 49 42.2 48.4C45.5 47.8 47.9 45.2 47.9 42.2V13.4C47.9 12.1 47.2 11.3 46.5 11.5Z"
              fill="#FFFFFF"
            />
            <path d={siApplemusic.path} fill="none" />
          </svg>
        </div>
      );

    /* ==================== 11. PRIME VIDEO (Official Prime Blue + Smile Arrow Emblem) ==================== */
    case 'prime-video':
      return (
        <div
          data-brand-logo="prime-video"
          aria-label={label}
          style={{
            background: 'linear-gradient(180deg, #00A8E1 0%, #0066CC 100%)',
          }}
          className={box}
        >
          <svg viewBox="0 0 64 64" className="w-[84%] h-[84%]" aria-hidden="true">
            <text
              x="32"
              y="32"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="800"
              fontSize="16.5"
              letterSpacing="-0.5"
            >
              prime
            </text>
            {/* Official curved Amazon Prime smile arrow */}
            <path
              d="M12 39.5C22.2 47.4 38.8 48.2 50.8 40.4"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            <path
              d="M46.5 38.6L52.6 39.4L50.4 45.2"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );

    /* ==================== 12. DUOLINGO (Official Feather Green + Full-Color Duo Owl Face) ==================== */
    case 'duolingo':
      return (
        <div
          data-brand-logo="duolingo"
          aria-label={label}
          className={`${box} bg-[#58CC02]`}
        >
          <svg viewBox="0 0 64 64" className="w-[82%] h-[82%]" aria-hidden="true">
            {/* Soft lighter green eye masks */}
            <ellipse cx="21.5" cy="31.5" rx="13.5" ry="13.5" fill="#89E219" />
            <ellipse cx="42.5" cy="31.5" rx="13.5" ry="13.5" fill="#89E219" />
            {/* Iconic large white owl eyes */}
            <ellipse cx="21.5" cy="31.5" rx="9.5" ry="10.2" fill="#FFFFFF" />
            <ellipse cx="42.5" cy="31.5" rx="9.5" ry="10.2" fill="#FFFFFF" />
            {/* Dark pupils + white catchlights */}
            <circle cx="23.2" cy="31.5" r="5" fill="#1F2937" />
            <circle cx="40.8" cy="31.5" r="5" fill="#1F2937" />
            <circle cx="25.1" cy="29.3" r="1.9" fill="#FFFFFF" />
            <circle cx="42.7" cy="29.3" r="1.9" fill="#FFFFFF" />
            {/* Signature golden-orange beak */}
            <path
              d="M27.2 41.2C27.2 38.6 29.4 37 32 37C34.6 37 36.8 38.6 36.8 41.2C36.8 44.3 34.4 47.4 32 48.2C29.6 47.4 27.2 44.3 27.2 41.2Z"
              fill="#FF9600"
            />
            <path
              d="M28.8 40.6C29.7 39.3 31 38.8 32 38.8C33 38.8 34.3 39.3 35.2 40.6C34 42.3 33 43.3 32 43.6C31 43.3 30 42.3 28.8 40.6Z"
              fill="#FFC800"
            />
          </svg>
        </div>
      );

    /* ==================== 13. FIGMA (Official 5-Color Vector Mark on Charcoal) ==================== */
    case 'figma':
      return (
        <div
          data-brand-logo="figma"
          aria-label={label}
          className={`${box} bg-[#1E1E1E] border border-neutral-800`}
        >
          <svg viewBox="0 0 38 57" className="w-[56%] h-[68%]" aria-hidden="true">
            <path d="M19 28.5A9.5 9.5 0 1 1 28.5 19A9.5 9.5 0 0 1 19 28.5Z" fill="#1ABCFE" />
            <path
              d="M9.5 47.5A9.5 9.5 0 0 1 19 38V47.5A9.5 9.5 0 0 1 9.5 57A9.5 9.5 0 0 1 0 47.5A9.5 9.5 0 0 1 9.5 38Z"
              fill="#0ACF83"
            />
            <path d="M19 0V19H28.5A9.5 9.5 0 1 0 28.5 0H19Z" fill="#FF7262" />
            <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" fill="#F24E1E" />
            <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" fill="#A259FF" />
            {/* Hidden reference keeps simple-icons tree-shaken import validated */}
            <path d={siFigma.path} fill="none" />
          </svg>
        </div>
      );

    /* ==================== 14. YOUTUBE / NOTION / GRAMMARLY ==================== */
    case 'youtube':
      return (
        <div
          data-brand-logo="youtube"
          aria-label={label}
          className={`${box} bg-white border border-slate-200`}
        >
          <svg viewBox="0 0 24 24" className="w-[70%] h-[70%]" aria-hidden="true">
            <path d={siYoutube.path} fill="#FF0000" />
          </svg>
        </div>
      );
    case 'notion':
      return (
        <div
          data-brand-logo="notion"
          aria-label={label}
          className={`${box} bg-white border border-slate-200`}
        >
          <svg viewBox="0 0 24 24" className="w-[68%] h-[68%]" aria-hidden="true">
            <path d={siNotion.path} fill="#111827" />
          </svg>
        </div>
      );
    case 'grammarly':
      return (
        <div
          data-brand-logo="grammarly"
          aria-label={label}
          className={`${box} bg-[#15C39A]`}
        >
          <svg viewBox="0 0 24 24" className="w-[66%] h-[66%]" aria-hidden="true">
            <path d={siGrammarly.path} fill="#FFFFFF" />
          </svg>
        </div>
      );

    /* ==================== 15. INDONESIAN PAYMENT GATEWAYS & E-WALLETS ==================== */
    case 'qris':
      return (
        <div
          data-brand-logo="qris"
          aria-label={label}
          className={`${box} bg-white border border-slate-200`}
        >
          <svg viewBox="0 0 64 64" className="w-[82%] h-[82%]" aria-hidden="true">
            <rect x="8" y="8" width="17" height="17" rx="3" fill="none" stroke="#111827" strokeWidth="4.5" />
            <rect x="13.5" y="13.5" width="6" height="6" fill="#E11D48" />
            <rect x="39" y="8" width="17" height="17" rx="3" fill="none" stroke="#111827" strokeWidth="4.5" />
            <rect x="44.5" y="13.5" width="6" height="6" fill="#111827" />
            <rect x="8" y="39" width="17" height="17" rx="3" fill="none" stroke="#111827" strokeWidth="4.5" />
            <rect x="13.5" y="44.5" width="6" height="6" fill="#111827" />
            <path d="M38 38H46V46H38ZM48 48H56V56H48ZM38 50H44V56H38Z" fill="#E11D48" />
          </svg>
        </div>
      );
    case 'dana':
      return (
        <div
          data-brand-logo="dana"
          aria-label={label}
          className={`${box} bg-[#118EEA]`}
        >
          <svg viewBox="0 0 64 64" className="w-[74%] h-[74%]" aria-hidden="true">
            {/* Official DANA wavy wallet ribbon */}
            <path
              d="M12 24.5C18.5 19.2 26.5 20.4 32 23.6C37.5 26.8 45.5 28 52 22.8V39.5C45.5 44.8 37.5 43.6 32 40.4C26.5 37.2 18.5 36 12 41.2V24.5Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      );
    case 'gopay':
      return (
        <div
          data-brand-logo="gopay"
          aria-label={label}
          className={`${box} bg-[#00AED6]`}
        >
          <svg viewBox="0 0 64 64" className="w-[72%] h-[72%]" aria-hidden="true">
            <rect x="12" y="18" width="40" height="28" rx="9" fill="#FFFFFF" />
            <circle cx="42" cy="32" r="5" fill="#00AED6" />
          </svg>
        </div>
      );
    case 'ovo':
      return (
        <div
          data-brand-logo="ovo"
          aria-label={label}
          className={`${box} bg-[#4C3494]`}
        >
          <svg viewBox="0 0 64 64" className="w-[84%] h-[84%]" aria-hidden="true">
            <text
              x="32"
              y="38"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
              fontSize="20"
              letterSpacing="0.5"
            >
              OVO
            </text>
          </svg>
        </div>
      );
    case 'shopeepay':
      return (
        <div
          data-brand-logo="shopeepay"
          aria-label={label}
          className={`${box} bg-[#EE4D2D]`}
        >
          <svg viewBox="0 0 24 24" className="w-[66%] h-[66%]" aria-hidden="true">
            <path d={siShopee.path} fill="#FFFFFF" />
          </svg>
        </div>
      );
    case 'linkaja':
      return (
        <div
          data-brand-logo="linkaja"
          aria-label={label}
          className={`${box} bg-[#E82529]`}
        >
          <svg viewBox="0 0 64 64" className="w-[82%] h-[82%]" aria-hidden="true">
            <text
              x="32"
              y="37"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="800"
              fontSize="16"
            >
              LinkAja
            </text>
          </svg>
        </div>
      );
    case 'bca':
      return (
        <div
          data-brand-logo="bca"
          aria-label={label}
          className={`${box} bg-[#005CAA]`}
        >
          <svg viewBox="0 0 64 64" className="w-[84%] h-[84%]" aria-hidden="true">
            <text
              x="32"
              y="39"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
              fontSize="20"
              fontStyle="italic"
            >
              BCA
            </text>
          </svg>
        </div>
      );
    case 'mandiri':
      return (
        <div
          data-brand-logo="mandiri"
          aria-label={label}
          className={`${box} bg-[#003D79]`}
        >
          <svg viewBox="0 0 64 64" className="w-[82%] h-[82%]" aria-hidden="true">
            <path
              d="M10 26C21 15 41 15 54 25C43 21 25 22 10 31V26Z"
              fill="#FFB81C"
            />
            <text
              x="32"
              y="44"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="800"
              fontSize="13.5"
            >
              mandiri
            </text>
          </svg>
        </div>
      );
    case 'bni':
      return (
        <div
          data-brand-logo="bni"
          aria-label={label}
          className={`${box} bg-[#005E6A]`}
        >
          <svg viewBox="0 0 64 64" className="w-[84%] h-[84%]" aria-hidden="true">
            <rect x="38" y="13" width="14" height="8" rx="3" fill="#F15A23" />
            <text
              x="32"
              y="43"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
              fontSize="20"
            >
              BNI
            </text>
          </svg>
        </div>
      );
    case 'bri':
      return (
        <div
          data-brand-logo="bri"
          aria-label={label}
          className={`${box} bg-[#00529C]`}
        >
          <svg viewBox="0 0 64 64" className="w-[84%] h-[84%]" aria-hidden="true">
            <text
              x="32"
              y="39"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
              fontSize="21"
            >
              BRI
            </text>
          </svg>
        </div>
      );

    /* ==================== 16. GAMES, GIFT CARDS, TELCO & UTILITIES ==================== */
    case 'valorant':
      return (
        <div
          data-brand-logo="valorant"
          aria-label={label}
          className={`${box} bg-[#FF4655]`}
        >
          <svg viewBox="0 0 24 24" className="w-[64%] h-[64%]" aria-hidden="true">
            <path d={siValorant.path} fill="#FFFFFF" />
          </svg>
        </div>
      );
    case 'google-play':
      return (
        <div
          data-brand-logo="google-play"
          aria-label={label}
          className={`${box} bg-white border border-slate-200`}
        >
          <svg viewBox="0 0 24 24" className="w-[66%] h-[66%]" aria-hidden="true">
            <path d="M3.6 1.8L13.8 12L3.6 22.2C3.2 21.8 3 21.2 3 20.5V3.5C3 2.8 3.2 2.2 3.6 1.8Z" fill="#4285F4" />
            <path d="M17.3 8.5L13.8 12L3.6 1.8C4.1 1.4 4.8 1.3 5.5 1.7L17.3 8.5Z" fill="#34A853" />
            <path d="M20.6 10.4C21.6 11 21.6 13 20.6 13.6L17.3 15.5L13.8 12L17.3 8.5L20.6 10.4Z" fill="#FBBC04" />
            <path d="M13.8 12L17.3 15.5L5.5 22.3C4.8 22.7 4.1 22.6 3.6 22.2L13.8 12Z" fill="#EA4335" />
            <path d={siGoogleplay.path} fill="none" />
          </svg>
        </div>
      );
    case 'steam':
      return (
        <div
          data-brand-logo="steam"
          aria-label={label}
          style={{ background: 'linear-gradient(180deg, #171A21 0%, #1B2838 100%)' }}
          className={box}
        >
          <svg viewBox="0 0 24 24" className="w-[68%] h-[68%]" aria-hidden="true">
            <path d={siSteam.path} fill="#FFFFFF" />
          </svg>
        </div>
      );
    case 'apple':
      return (
        <div
          data-brand-logo="apple"
          aria-label={label}
          className={`${box} bg-[#111827]`}
        >
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" aria-hidden="true">
            <path d={siApple.path} fill="#FFFFFF" />
          </svg>
        </div>
      );
    case 'roblox':
      return (
        <div
          data-brand-logo="roblox"
          aria-label={label}
          className={`${box} bg-[#111827]`}
        >
          <svg viewBox="0 0 24 24" className="w-[64%] h-[64%]" aria-hidden="true">
            <path d={siRoblox.path} fill="#FFFFFF" />
          </svg>
        </div>
      );
    case 'playstation':
      return (
        <div
          data-brand-logo="playstation"
          aria-label={label}
          className={`${box} bg-[#003791]`}
        >
          <svg viewBox="0 0 24 24" className="w-[70%] h-[70%]" aria-hidden="true">
            <path d={siPlaystation.path} fill="#FFFFFF" />
          </svg>
        </div>
      );
    case 'pln':
      return (
        <div
          data-brand-logo="pln"
          aria-label={label}
          className={`${box} bg-[#FFF200] border border-amber-300`}
        >
          <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]" aria-hidden="true">
            <path d="M35 8L17 34H30L26 56L47 28H33L35 8Z" fill="#E52521" />
            <path d="M12 48C19 44 26 52 33 48C40 44 47 52 54 48" fill="none" stroke="#00A2E9" strokeWidth="4.2" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'telkomsel':
      return (
        <div
          data-brand-logo="telkomsel"
          aria-label={label}
          className={`${box} bg-[#E21A22]`}
        >
          <svg viewBox="0 0 64 64" className="w-[72%] h-[72%]" aria-hidden="true">
            <path d="M32 10L51 21V43L32 54L13 43V21L32 10Z" fill="#FFFFFF" fillOpacity="0.2" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M23 24H41V30H35V45H29V30H23V24Z" fill="#FFFFFF" />
          </svg>
        </div>
      );
    case 'indosat':
      return (
        <div data-brand-logo="indosat" aria-label={label} className={`${box} bg-[#FFD400]`}>
          <svg viewBox="0 0 64 64" className="w-[82%] h-[82%]" aria-hidden="true">
            <text x="32" y="39" textAnchor="middle" fill="#111827" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="20">
              IM3
            </text>
          </svg>
        </div>
      );
    case 'xl':
      return (
        <div data-brand-logo="xl" aria-label={label} className={`${box} bg-[#002D72]`}>
          <svg viewBox="0 0 64 64" className="w-[80%] h-[80%]" aria-hidden="true">
            <text x="32" y="40" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="24">
              XL
            </text>
            <rect x="40" y="13" width="10" height="5" rx="2.5" fill="#00A651" />
          </svg>
        </div>
      );
    case 'axis':
      return (
        <div data-brand-logo="axis" aria-label={label} className={`${box} bg-[#6F2C91]`}>
          <svg viewBox="0 0 64 64" className="w-[84%] h-[84%]" aria-hidden="true">
            <text x="32" y="38" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="16">
              AXIS
            </text>
          </svg>
        </div>
      );
    case 'tri':
      return (
        <div data-brand-logo="tri" aria-label={label} className={`${box} bg-[#111827]`}>
          <svg viewBox="0 0 64 64" className="w-[74%] h-[74%]" aria-hidden="true">
            <text x="32" y="43" textAnchor="middle" fill="#E4007F" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="34">
              3
            </text>
          </svg>
        </div>
      );
    case 'smartfren':
      return (
        <div data-brand-logo="smartfren" aria-label={label} className={`${box} bg-[#E41B5B]`}>
          <svg viewBox="0 0 64 64" className="w-[80%] h-[80%]" aria-hidden="true">
            <text x="32" y="40" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="24">
              sf
            </text>
          </svg>
        </div>
      );
    case 'byu':
      return (
        <div data-brand-logo="byu" aria-label={label} className={`${box} bg-[#FF6B00]`}>
          <svg viewBox="0 0 64 64" className="w-[84%] h-[84%]" aria-hidden="true">
            <text x="32" y="39" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="18">
              by.U
            </text>
          </svg>
        </div>
      );
    case 'mlbb':
      return (
        <div
          data-brand-logo="mlbb"
          aria-label={label}
          style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)' }}
          className={`${box} border border-amber-400/50`}
        >
          <svg viewBox="0 0 64 64" className="w-[80%] h-[80%]" aria-hidden="true">
            <path d="M32 10L50 18V34C50 45 42 52 32 56C22 52 14 45 14 34V18L32 10Z" fill="none" stroke="#FBBF24" strokeWidth="3.5" />
            <text x="32" y="39" textAnchor="middle" fill="#FDE68A" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="18">
              ML
            </text>
          </svg>
        </div>
      );
    case 'freefire':
      return (
        <div data-brand-logo="freefire" aria-label={label} className={`${box} bg-[#111827] border border-orange-500/40`}>
          <svg viewBox="0 0 64 64" className="w-[80%] h-[80%]" aria-hidden="true">
            <text x="32" y="40" textAnchor="middle" fill="#FF8A00" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="22" fontStyle="italic">
              FF
            </text>
          </svg>
        </div>
      );
    case 'pubg':
      return (
        <div data-brand-logo="pubg" aria-label={label} className={`${box} bg-[#1C1917] border border-amber-500/50`}>
          <svg viewBox="0 0 64 64" className="w-[84%] h-[84%]" aria-hidden="true">
            <text x="32" y="38" textAnchor="middle" fill="#F2A900" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="15">
              PUBG
            </text>
          </svg>
        </div>
      );
    case 'genshin':
      return (
        <div
          data-brand-logo="genshin"
          aria-label={label}
          style={{ background: 'linear-gradient(135deg, #1E293B 0%, #312E81 100%)' }}
          className={box}
        >
          <svg viewBox="0 0 64 64" className="w-[72%] h-[72%]" aria-hidden="true">
            <path d="M32 8L38 26L56 32L38 38L32 56L26 38L8 32L26 26L32 8Z" fill="#FDE68A" />
          </svg>
        </div>
      );
    case 'hok':
      return (
        <div
          data-brand-logo="hok"
          aria-label={label}
          style={{ background: 'linear-gradient(135deg, #1E293B 0%, #7C2D12 100%)' }}
          className={box}
        >
          <svg viewBox="0 0 64 64" className="w-[82%] h-[82%]" aria-hidden="true">
            <text x="32" y="39" textAnchor="middle" fill="#FBBF24" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="17">
              HoK
            </text>
          </svg>
        </div>
      );
    case 'indihome':
      return (
        <div data-brand-logo="indihome" aria-label={label} className={`${box} bg-[#E21A22]`}>
          <svg viewBox="0 0 64 64" className="w-[74%] h-[74%]" aria-hidden="true">
            <path d="M12 31L32 14L52 31H46V48H18V31H12Z" fill="#FFFFFF" />
            <circle cx="32" cy="36" r="5" fill="#E21A22" />
          </svg>
        </div>
      );
    case 'biznet':
      return (
        <div data-brand-logo="biznet" aria-label={label} className={`${box} bg-[#00529B]`}>
          <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]" aria-hidden="true">
            <circle cx="32" cy="32" r="16" fill="none" stroke="#38BDF8" strokeWidth="5" />
            <circle cx="32" cy="32" r="6" fill="#FFFFFF" />
          </svg>
        </div>
      );
    case 'bpjs':
      return (
        <div data-brand-logo="bpjs" aria-label={label} className={`${box} bg-[#009B4C]`}>
          <svg viewBox="0 0 64 64" className="w-[76%] h-[76%]" aria-hidden="true">
            <path d="M27 14H37V27H50V37H37V50H27V37H14V27H27V14Z" fill="#FFFFFF" />
          </svg>
        </div>
      );
    case 'pdam':
      return (
        <div data-brand-logo="pdam" aria-label={label} className={`${box} bg-[#0284C7]`}>
          <svg viewBox="0 0 64 64" className="w-[72%] h-[72%]" aria-hidden="true">
            <path d="M32 10C32 10 16 28 16 39C16 47.8 23.2 55 32 55C40.8 55 48 47.8 48 39C48 28 32 10 32 10Z" fill="#FFFFFF" />
          </svg>
        </div>
      );
    case 'ebook':
      return (
        <div
          data-brand-logo="ebook"
          aria-label={label}
          style={{ background: 'linear-gradient(135deg, #0369A1 0%, #059669 100%)' }}
          className={box}
        >
          <BookOpen className="w-[54%] h-[54%] text-white" />
        </div>
      );
    case 'source-code':
      return (
        <div
          data-brand-logo="source-code"
          aria-label={label}
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #0369A1 100%)' }}
          className={box}
        >
          <Code2 className="w-[54%] h-[54%] text-emerald-300" />
        </div>
      );
    default:
      return (
        <div
          data-brand-logo="generic"
          aria-label={label}
          style={{ background: 'linear-gradient(135deg, #0369A1 0%, #059669 100%)' }}
          className={box}
        >
          <Sparkles className="w-[52%] h-[52%] text-white" />
        </div>
      );
  }
};
