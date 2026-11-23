import React from 'react';

interface VocabIllustrationProps {
  imageKey: string;
  label?: string;
  className?: string;
}

function renderArtwork(key: string): React.ReactNode {
  switch (key.toLowerCase()) {
    // --- FRUTAS E ALIMENTOS ---
    case 'apple':
      return (
        <g>
          <path d="M50 28 C44 18, 34 22, 34 22 C34 22, 38 30, 48 30" fill="#16A34A" />
          <path d="M50 30 L52 17" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M50 31 C36 27, 22 36, 23 55 C24 75, 38 86, 48 84 C50 83.5, 50 83.5, 52 84 C62 86, 76 75, 77 55 C78 36, 64 27, 50 31 Z"
            fill="#DC2626"
          />
          <ellipse cx="36" cy="46" rx="5" ry="10" transform="rotate(-18 36 46)" fill="#FCA5A5" opacity="0.65" />
        </g>
      );
    case 'banana':
      return (
        <g>
          <path
            d="M24 68 C36 80, 68 74, 80 42 C82 36, 80 28, 76 24 L72 28 C72 44, 54 64, 28 62 Z"
            fill="#FACC15"
            stroke="#CA8A04"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M76 24 L80 20" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
          <path d="M26 66 L22 70" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'orange':
      return (
        <g>
          <path d="M50 24 L54 15" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M53 20 C62 14, 70 20, 66 26 C60 27, 55 24, 53 20 Z" fill="#16A34A" />
          <circle cx="50" cy="54" r="28" fill="#F97316" />
          <circle cx="40" cy="43" r="6" fill="#FDBA74" opacity="0.6" />
          <circle cx="58" cy="60" r="1.5" fill="#C2410C" />
          <circle cx="64" cy="48" r="1.5" fill="#C2410C" />
          <circle cx="46" cy="66" r="1.5" fill="#C2410C" />
        </g>
      );
    case 'pear':
      return (
        <g>
          <path d="M50 22 L51 13" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M51 17 C60 13, 66 18, 63 24 C58 25, 53 22, 51 17 Z" fill="#15803D" />
          <path
            d="M50 22 C41 22, 38 33, 37 42 C35 50, 26 55, 26 67 C26 80, 37 86, 50 86 C63 86, 74 80, 74 67 C74 55, 65 50, 63 42 C62 33, 59 22, 50 22 Z"
            fill="#84CC16"
          />
          <ellipse cx="38" cy="66" rx="4.5" ry="9" transform="rotate(-12 38 66)" fill="#ECFCCB" opacity="0.6" />
        </g>
      );
    case 'bread':
      return (
        <g>
          <path
            d="M22 48 C22 32, 34 26, 50 26 C66 26, 78 32, 78 48 L74 74 C74 77, 71 79, 68 79 L32 79 C29 79, 26 77, 26 74 Z"
            fill="#D97706"
          />
          <path
            d="M28 50 C28 38, 37 33, 50 33 C63 33, 72 38, 72 50 L69 72 L31 72 Z"
            fill="#FDE68A"
          />
          <path d="M38 44 L44 50 M50 41 L55 48 M61 44 L65 49" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'milk':
      return (
        <g>
          <polygon points="34,30 66,30 66,82 34,82" fill="#FFFFFF" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round" />
          <polygon points="34,30 44,18 56,18 66,30" fill="#DBEAFE" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round" />
          <rect x="42" y="12" width="16" height="6" rx="2" fill="#1D4ED8" />
          <rect x="36" y="48" width="28" height="22" fill="#3B82F6" />
          <circle cx="50" cy="59" r="6" fill="#FFFFFF" />
        </g>
      );
    case 'cheese':
      return (
        <g>
          <polygon points="18,68 82,68 74,34 18,52" fill="#FACC15" stroke="#CA8A04" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="18,52 74,34 52,24" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="38" cy="58" r="5" fill="#CA8A04" />
          <circle cx="58" cy="52" r="4" fill="#CA8A04" />
          <circle cx="66" cy="61" r="3" fill="#CA8A04" />
        </g>
      );
    case 'egg':
      return (
        <g>
          <path
            d="M50 18 C34 18, 25 42, 25 60 C25 76, 36 85, 50 85 C64 85, 75 76, 75 60 C75 42, 66 18, 50 18 Z"
            fill="#FEF3C7"
            stroke="#D97706"
            strokeWidth="2.5"
          />
          <ellipse cx="40" cy="44" rx="5" ry="11" transform="rotate(-14 40 44)" fill="#FFFFFF" opacity="0.8" />
        </g>
      );
    case 'strawberry':
      return (
        <g>
          <path d="M36 28 L50 18 L64 28 L56 33 L50 26 L44 33 Z" fill="#16A34A" />
          <path
            d="M28 36 C28 28, 72 28, 72 36 C72 58, 58 84, 50 84 C42 84, 28 58, 28 36 Z"
            fill="#E11D48"
          />
          <circle cx="40" cy="46" r="1.8" fill="#FEF08A" />
          <circle cx="52" cy="44" r="1.8" fill="#FEF08A" />
          <circle cx="60" cy="52" r="1.8" fill="#FEF08A" />
          <circle cx="44" cy="60" r="1.8" fill="#FEF08A" />
          <circle cx="54" cy="66" r="1.8" fill="#FEF08A" />
          <circle cx="50" cy="74" r="1.8" fill="#FEF08A" />
        </g>
      );
    case 'cake':
      return (
        <g>
          <rect x="24" y="48" width="52" height="30" rx="5" fill="#FDE68A" stroke="#B45309" strokeWidth="2.5" />
          <path d="M24 54 Q32 62 40 54 Q48 62 56 54 Q64 62 76 54 L76 48 L24 48 Z" fill="#F472B6" />
          <rect x="47" y="28" width="6" height="20" rx="2" fill="#3B82F6" />
          <path d="M50 16 C46 22, 46 27, 50 27 C54 27, 54 22, 50 16 Z" fill="#F59E0B" />
        </g>
      );

    // --- ANIMAIS ---
    case 'dog':
      return (
        <g>
          <ellipse cx="26" cy="48" rx="9" ry="18" transform="rotate(15 26 48)" fill="#92400E" />
          <ellipse cx="74" cy="48" rx="9" ry="18" transform="rotate(-15 74 48)" fill="#92400E" />
          <circle cx="50" cy="52" r="24" fill="#D97706" />
          <ellipse cx="50" cy="61" rx="13" ry="10" fill="#FDE68A" />
          <circle cx="41" cy="46" r="3.5" fill="#0F172A" />
          <circle cx="59" cy="46" r="3.5" fill="#0F172A" />
          <ellipse cx="50" cy="56" rx="5" ry="3.5" fill="#0F172A" />
          <path d="M44 63 Q50 69 56 63" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="50" cy="68" rx="4" ry="5" fill="#F43F5E" />
        </g>
      );
    case 'cat':
      return (
        <g>
          <polygon points="28,42 26,18 46,32" fill="#64748B" />
          <polygon points="72,42 74,18 54,32" fill="#64748B" />
          <polygon points="31,38 30,24 41,33" fill="#FDA4AF" />
          <polygon points="69,38 70,24 59,33" fill="#FDA4AF" />
          <circle cx="50" cy="54" r="23" fill="#94A3B8" />
          <circle cx="41" cy="50" r="3.5" fill="#0F172A" />
          <circle cx="59" cy="50" r="3.5" fill="#0F172A" />
          <polygon points="47,57 53,57 50,61" fill="#F43F5E" />
          <path d="M22 54 L36 56 M22 60 L36 59 M78 54 L64 56 M78 60 L64 59" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'bird':
      return (
        <g>
          <ellipse cx="48" cy="58" rx="22" ry="17" fill="#0EA5E9" />
          <circle cx="64" cy="42" r="13" fill="#0EA5E9" />
          <polygon points="76,40 88,44 76,48" fill="#F59E0B" />
          <circle cx="68" cy="39" r="2.5" fill="#0F172A" />
          <path d="M36 52 C44 46, 56 54, 48 64 C40 66, 32 60, 36 52 Z" fill="#0284C7" />
          <polygon points="27,54 16,48 20,60" fill="#0369A1" />
          <path d="M44 74 L44 84 M54 74 L54 84" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'fish':
      return (
        <g>
          <polygon points="68,52 86,36 86,68" fill="#EA580C" />
          <ellipse cx="45" cy="52" rx="26" ry="17" fill="#F97316" />
          <path d="M42 36 L52 24 L56 36 Z" fill="#EA580C" />
          <circle cx="30" cy="48" r="3.5" fill="#FFFFFF" />
          <circle cx="29" cy="48" r="1.8" fill="#0F172A" />
          <path d="M44 42 Q50 52 44 62" fill="none" stroke="#FED7AA" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="16" cy="34" r="3" fill="#38BDF8" />
          <circle cx="12" cy="25" r="2" fill="#38BDF8" />
        </g>
      );
    case 'cow':
      return (
        <g>
          <path d="M30 30 Q22 20 30 22" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M70 30 Q78 20 70 22" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" fill="none" />
          <ellipse cx="26" cy="38" rx="9" ry="5" fill="#1E293B" />
          <ellipse cx="74" cy="38" rx="9" ry="5" fill="#1E293B" />
          <rect x="29" y="28" width="42" height="44" rx="18" fill="#FFFFFF" stroke="#334155" strokeWidth="2.5" />
          <path d="M30 34 C40 34, 42 46, 30 48 Z" fill="#1E293B" />
          <ellipse cx="50" cy="64" rx="17" ry="11" fill="#FBCFE8" />
          <circle cx="41" cy="44" r="3" fill="#0F172A" />
          <circle cx="59" cy="44" r="3" fill="#0F172A" />
          <circle cx="44" cy="63" r="2.2" fill="#9D174D" />
          <circle cx="56" cy="63" r="2.2" fill="#9D174D" />
        </g>
      );
    case 'horse':
      return (
        <g>
          <path d="M36 22 L42 38 L30 38 Z" fill="#78350F" />
          <path d="M62 22 L68 38 L56 38 Z" fill="#78350F" />
          <path d="M35 32 L46 22 L54 32 L48 44 Z" fill="#451A03" />
          <rect x="33" y="32" width="34" height="44" rx="14" fill="#92400E" />
          <ellipse cx="50" cy="68" rx="14" ry="10" fill="#B45309" />
          <circle cx="42" cy="46" r="3" fill="#0F172A" />
          <circle cx="58" cy="46" r="3" fill="#0F172A" />
          <circle cx="45" cy="68" r="2" fill="#451A03" />
          <circle cx="55" cy="68" r="2" fill="#451A03" />
        </g>
      );
    case 'duck':
      return (
        <g>
          <ellipse cx="46" cy="62" rx="24" ry="16" fill="#FACC15" />
          <circle cx="62" cy="36" r="13" fill="#FACC15" />
          <polygon points="73,34 88,38 73,43" fill="#EA580C" />
          <circle cx="65" cy="33" r="2.5" fill="#0F172A" />
          <path d="M34 56 C44 52, 56 58, 48 67 C38 69, 30 63, 34 56 Z" fill="#EAB308" />
        </g>
      );
    case 'frog':
      return (
        <g>
          <circle cx="36" cy="34" r="9" fill="#22C55E" />
          <circle cx="64" cy="34" r="9" fill="#22C55E" />
          <circle cx="36" cy="34" r="4.5" fill="#FFFFFF" />
          <circle cx="64" cy="34" r="4.5" fill="#FFFFFF" />
          <circle cx="36" cy="34" r="2.2" fill="#0F172A" />
          <circle cx="64" cy="34" r="2.2" fill="#0F172A" />
          <ellipse cx="50" cy="56" rx="26" ry="19" fill="#16A34A" />
          <ellipse cx="50" cy="63" rx="18" ry="10" fill="#BBF7D0" />
          <path d="M36 52 Q50 61 64 52" fill="none" stroke="#14532D" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );

    // --- OBJETOS ---
    case 'book':
      return (
        <g>
          <rect x="22" y="22" width="56" height="58" rx="5" fill="#1D4ED8" />
          <rect x="30" y="22" width="48" height="58" rx="4" fill="#2563EB" />
          <rect x="32" y="64" width="44" height="10" rx="2" fill="#FFFFFF" />
          <rect x="40" y="34" width="28" height="16" rx="2" fill="#DBEAFE" />
          <line x1="30" y1="22" x2="30" y2="80" stroke="#1E3A8A" strokeWidth="3" />
        </g>
      );
    case 'cup':
      return (
        <g>
          <path d="M68 44 C80 44, 80 64, 68 64" fill="none" stroke="#0284C7" strokeWidth="5" strokeLinecap="round" />
          <path d="M26 38 L70 38 L66 74 C65 78, 61 80, 56 80 L40 80 C35 80, 31 78, 30 74 Z" fill="#0EA5E9" />
          <path d="M38 26 Q42 20 38 15 M50 26 Q54 20 50 15 M60 26 Q64 20 60 15" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'key':
      return (
        <g>
          <circle cx="34" cy="50" r="15" fill="none" stroke="#D97706" strokeWidth="7" />
          <circle cx="34" cy="50" r="5" fill="#F59E0B" />
          <rect x="47" y="46" width="34" height="8" rx="3" fill="#D97706" />
          <rect x="64" y="54" width="6" height="10" rx="1" fill="#D97706" />
          <rect x="74" y="54" width="6" height="13" rx="1" fill="#D97706" />
        </g>
      );
    case 'clock':
      return (
        <g>
          <circle cx="50" cy="50" r="31" fill="#1E293B" />
          <circle cx="50" cy="50" r="25" fill="#FFFFFF" />
          <line x1="50" y1="50" x2="50" y2="33" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="50" y1="50" x2="63" y2="56" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="50" r="3" fill="#0F172A" />
        </g>
      );
    case 'phone':
      return (
        <g>
          <rect x="31" y="16" width="38" height="68" rx="7" fill="#1E293B" />
          <rect x="35" y="23" width="30" height="50" rx="2" fill="#38BDF8" />
          <rect x="44" y="19" width="12" height="2" rx="1" fill="#64748B" />
          <circle cx="50" cy="78" r="2.5" fill="#94A3B8" />
        </g>
      );
    case 'pencil':
      return (
        <g transform="rotate(-35 50 50)">
          <rect x="42" y="22" width="16" height="48" fill="#FACC15" />
          <rect x="42" y="16" width="16" height="8" rx="2" fill="#F472B6" />
          <rect x="42" y="22" width="16" height="4" fill="#94A3B8" />
          <polygon points="42,70 58,70 50,86" fill="#FDE68A" />
          <polygon points="47,80 53,80 50,86" fill="#0F172A" />
        </g>
      );
    case 'chair':
      return (
        <g>
          <rect x="32" y="20" width="36" height="28" rx="4" fill="#B45309" />
          <rect x="28" y="48" width="44" height="9" rx="3" fill="#D97706" />
          <rect x="32" y="57" width="7" height="25" rx="2" fill="#92400E" />
          <rect x="61" y="57" width="7" height="25" rx="2" fill="#92400E" />
        </g>
      );
    case 'backpack':
      return (
        <g>
          <path d="M42 22 C42 15, 58 15, 58 22" fill="none" stroke="#1E3A8A" strokeWidth="4" />
          <rect x="26" y="24" width="48" height="56" rx="14" fill="#2563EB" />
          <rect x="33" y="50" width="34" height="22" rx="6" fill="#1D4ED8" />
          <line x1="36" y1="56" x2="64" y2="56" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );

    // --- NATUREZA E TEMPO ---
    case 'sun':
      return (
        <g>
          <circle cx="50" cy="50" r="19" fill="#FACC15" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="50"
              y1="14"
              x2="50"
              y2="24"
              stroke="#F59E0B"
              strokeWidth="4.5"
              strokeLinecap="round"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
        </g>
      );
    case 'moon':
      return (
        <g>
          <circle cx="50" cy="50" r="32" fill="#1E293B" />
          <path
            d="M56 26 C40 28, 30 42, 34 58 C38 72, 54 78, 66 70 C54 72, 44 63, 44 50 C44 38, 50 30, 56 26 Z"
            fill="#FDE047"
          />
          <circle cx="64" cy="36" r="2.2" fill="#FEF08A" />
          <circle cx="70" cy="52" r="1.6" fill="#FEF08A" />
        </g>
      );
    case 'star':
      return (
        <g>
          <polygon
            points="50,14 60,38 86,40 66,57 72,83 50,69 28,83 34,57 14,40 40,38"
            fill="#FACC15"
            stroke="#CA8A04"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'rain':
      return (
        <g>
          <path
            d="M28 52 C20 52, 16 44, 22 37 C23 26, 36 20, 47 26 C55 18, 72 22, 74 36 C82 37, 84 52, 72 52 Z"
            fill="#64748B"
          />
          <line x1="34" y1="62" x2="29" y2="75" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="62" x2="45" y2="75" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
          <line x1="66" y1="62" x2="61" y2="75" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'tree':
      return (
        <g>
          <rect x="43" y="54" width="14" height="30" rx="2" fill="#78350F" />
          <circle cx="50" cy="40" r="21" fill="#16A34A" />
          <circle cx="35" cy="46" r="14" fill="#15803D" />
          <circle cx="65" cy="46" r="14" fill="#15803D" />
          <circle cx="50" cy="27" r="15" fill="#22C55E" />
        </g>
      );
    case 'flower':
      return (
        <g>
          <line x1="50" y1="52" x2="50" y2="85" stroke="#16A34A" strokeWidth="5" strokeLinecap="round" />
          <path d="M50 72 C62 64, 68 72, 58 78 Z" fill="#22C55E" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx="50"
              cy="28"
              rx="8"
              ry="13"
              fill="#EC4899"
              transform={`rotate(${deg} 50 42)`}
            />
          ))}
          <circle cx="50" cy="42" r="9" fill="#FACC15" />
        </g>
      );
    case 'cloud':
      return (
        <g>
          <path
            d="M26 66 C16 66, 12 54, 21 46 C22 32, 38 24, 51 32 C61 23, 78 29, 80 44 C88 46, 90 66, 76 66 Z"
            fill="#E2E8F0"
            stroke="#94A3B8"
            strokeWidth="2.5"
          />
        </g>
      );
    case 'water':
      return (
        <g>
          <path
            d="M50 16 C50 16, 26 48, 26 64 C26 78, 37 86, 50 86 C63 86, 74 78, 74 64 C74 48, 50 16, 50 16 Z"
            fill="#0EA5E9"
          />
          <path
            d="M38 56 C36 64, 40 72, 46 75"
            fill="none"
            stroke="#BAE6FD"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      );

    // --- TRANSPORTES ---
    case 'car':
      return (
        <g>
          <path d="M26 50 L35 32 L65 32 L74 50 Z" fill="#2563EB" />
          <rect x="16" y="48" width="68" height="20" rx="6" fill="#1D4ED8" />
          <polygon points="37,35 48,35 48,47 30,47" fill="#DBEAFE" />
          <polygon points="52,35 63,35 70,47 52,47" fill="#DBEAFE" />
          <circle cx="31" cy="69" r="9" fill="#0F172A" />
          <circle cx="31" cy="69" r="4" fill="#CBD5E1" />
          <circle cx="69" cy="69" r="9" fill="#0F172A" />
          <circle cx="69" cy="69" r="4" fill="#CBD5E1" />
        </g>
      );
    case 'bus':
      return (
        <g>
          <rect x="16" y="28" width="68" height="40" rx="7" fill="#F59E0B" />
          <rect x="22" y="34" width="16" height="14" rx="2" fill="#E0F2FE" />
          <rect x="42" y="34" width="16" height="14" rx="2" fill="#E0F2FE" />
          <rect x="62" y="34" width="16" height="14" rx="2" fill="#E0F2FE" />
          <circle cx="31" cy="70" r="8" fill="#0F172A" />
          <circle cx="69" cy="70" r="8" fill="#0F172A" />
          <circle cx="31" cy="70" r="3.5" fill="#CBD5E1" />
          <circle cx="69" cy="70" r="3.5" fill="#CBD5E1" />
        </g>
      );
    case 'train':
      return (
        <g>
          <rect x="26" y="22" width="48" height="50" rx="8" fill="#DC2626" />
          <rect x="33" y="30" width="34" height="16" rx="3" fill="#E0F2FE" />
          <circle cx="36" cy="58" r="4" fill="#FEF08A" />
          <circle cx="64" cy="58" r="4" fill="#FEF08A" />
          <line x1="22" y1="82" x2="38" y2="72" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          <line x1="78" y1="82" x2="62" y2="72" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'bicycle':
      return (
        <g>
          <circle cx="28" cy="64" r="14" fill="none" stroke="#1E293B" strokeWidth="4" />
          <circle cx="72" cy="64" r="14" fill="none" stroke="#1E293B" strokeWidth="4" />
          <polyline
            points="28,64 46,42 66,42 72,64 48,64 28,64"
            fill="none"
            stroke="#0284C7"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <line x1="46" y1="42" x2="48" y2="64" stroke="#0284C7" strokeWidth="3.5" />
          <line x1="41" y1="36" x2="50" y2="36" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
          <line x1="63" y1="35" x2="68" y2="42" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );
    case 'plane':
      return (
        <g>
          <path d="M16 52 L42 46 L52 18 L60 18 L56 46 L78 46 L86 38 L88 54 L76 54 L56 58 L60 80 L52 80 L42 58 Z" fill="#2563EB" />
          <circle cx="68" cy="50" r="2.5" fill="#DBEAFE" />
          <circle cx="58" cy="50" r="2.5" fill="#DBEAFE" />
        </g>
      );
    case 'boat':
      return (
        <g>
          <line x1="50" y1="18" x2="50" y2="58" stroke="#78350F" strokeWidth="3.5" />
          <polygon points="50,20 76,52 50,52" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          <polygon points="48,26 28,52 48,52" fill="#FDE047" />
          <polygon points="20,58 80,58 70,74 30,74" fill="#DC2626" />
          <path d="M14 78 Q28 72 42 78 T70 78 T88 78" fill="none" stroke="#0EA5E9" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );

    // --- CASA E VESTUÁRIO ---
    case 'house':
      return (
        <g>
          <polygon points="50,18 16,48 84,48" fill="#DC2626" />
          <rect x="24" y="48" width="52" height="34" fill="#FEF3C7" stroke="#D97706" strokeWidth="2" />
          <rect x="43" y="58" width="14" height="24" rx="2" fill="#92400E" />
          <rect x="29" y="55" width="10" height="10" rx="1" fill="#38BDF8" />
          <rect x="61" y="55" width="10" height="10" rx="1" fill="#38BDF8" />
        </g>
      );
    case 'bed':
      return (
        <g>
          <rect x="16" y="42" width="8" height="34" rx="2" fill="#78350F" />
          <rect x="76" y="52" width="8" height="24" rx="2" fill="#78350F" />
          <rect x="24" y="54" width="52" height="14" fill="#2563EB" />
          <rect x="25" y="46" width="16" height="8" rx="3" fill="#FFFFFF" />
          <rect x="20" y="66" width="60" height="6" fill="#92400E" />
        </g>
      );
    case 'table':
      return (
        <g>
          <rect x="16" y="38" width="68" height="10" rx="3" fill="#B45309" />
          <rect x="24" y="48" width="8" height="32" rx="2" fill="#78350F" />
          <rect x="68" y="48" width="8" height="32" rx="2" fill="#78350F" />
        </g>
      );
    case 'door':
      return (
        <g>
          <rect x="30" y="16" width="40" height="68" rx="3" fill="#92400E" />
          <rect x="36" y="24" width="28" height="22" rx="2" fill="#B45309" />
          <rect x="36" y="52" width="28" height="22" rx="2" fill="#B45309" />
          <circle cx="62" cy="50" r="3.5" fill="#FACC15" />
        </g>
      );
    case 'hat':
      return (
        <g>
          <path d="M32 54 C32 32, 68 32, 68 54 Z" fill="#1D4ED8" />
          <rect x="32" y="48" width="36" height="6" fill="#F59E0B" />
          <ellipse cx="50" cy="58" rx="34" ry="8" fill="#1E40AF" />
        </g>
      );
    case 'shoe':
      return (
        <g>
          <path
            d="M22 66 L78 66 C82 66, 82 56, 72 54 L54 48 L44 34 L26 38 L22 66 Z"
            fill="#DC2626"
          />
          <rect x="20" y="64" width="62" height="7" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
          <line x1="48" y1="42" x2="54" y2="40" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="52" y1="47" x2="58" y2="45" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'shirt':
      return (
        <g>
          <path
            d="M34 22 L16 34 L24 48 L32 42 L32 80 L68 80 L68 42 L76 48 L84 34 L66 22 C60 28, 40 28, 34 22 Z"
            fill="#0284C7"
          />
          <path d="M40 22 C44 30, 56 30, 60 22" fill="none" stroke="#E0F2FE" strokeWidth="3" />
        </g>
      );
    case 'umbrella':
      return (
        <g>
          <path d="M18 48 C18 26, 82 26, 82 48 Z" fill="#7C3AED" />
          <line x1="50" y1="22" x2="50" y2="74" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          <path d="M50 74 C50 82, 40 82, 40 74" fill="none" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="50" cy="50" r="28" fill="#E2E8F0" />
          <text x="50" y="55" textAnchor="middle" fontSize="14" fill="#334155" fontWeight="bold">
            {key.slice(0, 4).toUpperCase()}
          </text>
        </g>
      );
  }
}

export const VocabIllustration: React.FC<VocabIllustrationProps> = ({
  imageKey,
  label,
  className = 'w-28 h-28',
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 ${className}`}
      role="img"
      aria-label={label || `Ilustração de ${imageKey}`}
    >
      <svg viewBox="0 0 100 100" className="w-[84%] h-[84%]" aria-hidden="true">
        {renderArtwork(imageKey)}
      </svg>
    </div>
  );
};
