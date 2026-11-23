import crypto from 'node:crypto';
import type {
  CatalogItem,
  DifficultyTier,
  ExerciseQuestion,
} from '../src/types/learnmatch.ts';

export const VISUAL_CATALOG: CatalogItem[] = [
  // Frutas e Alimentos
  {
    key: 'apple',
    word: 'APPLE',
    translation: 'Maçã',
    phonetic: '/ˈæp.əl/',
    category: 'Frutas e Alimentos',
    difficulty: 'beginner',
    exampleSentence: 'I eat a red apple every morning.',
    exampleTranslation: 'Eu como uma maçã vermelha todas as manhãs.',
  },
  {
    key: 'banana',
    word: 'BANANA',
    translation: 'Banana',
    phonetic: '/bəˈnɑː.nə/',
    category: 'Frutas e Alimentos',
    difficulty: 'beginner',
    exampleSentence: 'The banana is sweet and yellow.',
    exampleTranslation: 'A banana é doce e amarela.',
  },
  {
    key: 'orange',
    word: 'ORANGE',
    translation: 'Laranja',
    phonetic: '/ˈɒr.ɪndʒ/',
    category: 'Frutas e Alimentos',
    difficulty: 'beginner',
    exampleSentence: 'She drinks fresh orange juice.',
    exampleTranslation: 'Ela bebe sumo de laranja fresco.',
  },
  {
    key: 'pear',
    word: 'PEAR',
    translation: 'Pera',
    phonetic: '/peər/',
    category: 'Frutas e Alimentos',
    difficulty: 'beginner',
    exampleSentence: 'This green pear is very juicy.',
    exampleTranslation: 'Esta pera verde é muito sumarenta.',
  },
  {
    key: 'bread',
    word: 'BREAD',
    translation: 'Pão',
    phonetic: '/bred/',
    category: 'Frutas e Alimentos',
    difficulty: 'beginner',
    exampleSentence: 'We buy warm bread at the bakery.',
    exampleTranslation: 'Compramos pão quente na padaria.',
  },
  {
    key: 'milk',
    word: 'MILK',
    translation: 'Leite',
    phonetic: '/mɪlk/',
    category: 'Frutas e Alimentos',
    difficulty: 'beginner',
    exampleSentence: 'Pour some milk into the glass.',
    exampleTranslation: 'Deita um pouco de leite no copo.',
  },
  {
    key: 'cheese',
    word: 'CHEESE',
    translation: 'Queijo',
    phonetic: '/tʃiːz/',
    category: 'Frutas e Alimentos',
    difficulty: 'elementary',
    exampleSentence: 'I like bread with yellow cheese.',
    exampleTranslation: 'Gosto de pão com queijo amarelo.',
  },
  {
    key: 'egg',
    word: 'EGG',
    translation: 'Ovo',
    phonetic: '/eɡ/',
    category: 'Frutas e Alimentos',
    difficulty: 'beginner',
    exampleSentence: 'He cooked an egg for breakfast.',
    exampleTranslation: 'Ele cozinhou um ovo para o pequeno-almoço.',
  },
  {
    key: 'strawberry',
    word: 'STRAWBERRY',
    translation: 'Morango',
    phonetic: '/ˈstrɔː.bər.i/',
    category: 'Frutas e Alimentos',
    difficulty: 'intermediate',
    exampleSentence: 'A strawberry is bright red.',
    exampleTranslation: 'Um morango é vermelho vivo.',
  },
  {
    key: 'cake',
    word: 'CAKE',
    translation: 'Bolo',
    phonetic: '/keɪk/',
    category: 'Frutas e Alimentos',
    difficulty: 'elementary',
    exampleSentence: 'They made a birthday cake.',
    exampleTranslation: 'Eles fizeram um bolo de aniversário.',
  },

  // Animais
  {
    key: 'dog',
    word: 'DOG',
    translation: 'Cão',
    phonetic: '/dɒɡ/',
    category: 'Animais',
    difficulty: 'beginner',
    exampleSentence: 'The friendly dog wags its tail.',
    exampleTranslation: 'O cão amigável abana a cauda.',
  },
  {
    key: 'cat',
    word: 'CAT',
    translation: 'Gato',
    phonetic: '/kæt/',
    category: 'Animais',
    difficulty: 'beginner',
    exampleSentence: 'The cat sleeps on the sofa.',
    exampleTranslation: 'O gato dorme no sofá.',
  },
  {
    key: 'bird',
    word: 'BIRD',
    translation: 'Pássaro',
    phonetic: '/bɜːd/',
    category: 'Animais',
    difficulty: 'beginner',
    exampleSentence: 'A blue bird sings in the tree.',
    exampleTranslation: 'Um pássaro azul canta na árvore.',
  },
  {
    key: 'fish',
    word: 'FISH',
    translation: 'Peixe',
    phonetic: '/fɪʃ/',
    category: 'Animais',
    difficulty: 'beginner',
    exampleSentence: 'The orange fish swims in the water.',
    exampleTranslation: 'O peixe laranja nada na água.',
  },
  {
    key: 'cow',
    word: 'COW',
    translation: 'Vaca',
    phonetic: '/kaʊ/',
    category: 'Animais',
    difficulty: 'elementary',
    exampleSentence: 'The cow lives on the green farm.',
    exampleTranslation: 'A vaca vive na quinta verde.',
  },
  {
    key: 'horse',
    word: 'HORSE',
    translation: 'Cavalo',
    phonetic: '/hɔːs/',
    category: 'Animais',
    difficulty: 'elementary',
    exampleSentence: 'A fast horse runs across the field.',
    exampleTranslation: 'Um cavalo rápido corre pelo campo.',
  },
  {
    key: 'duck',
    word: 'DUCK',
    translation: 'Pato',
    phonetic: '/dʌk/',
    category: 'Animais',
    difficulty: 'elementary',
    exampleSentence: 'The yellow duck floats on the lake.',
    exampleTranslation: 'O pato amarelo flutua no lago.',
  },
  {
    key: 'frog',
    word: 'FROG',
    translation: 'Rã',
    phonetic: '/frɒɡ/',
    category: 'Animais',
    difficulty: 'intermediate',
    exampleSentence: 'The green frog jumps near the river.',
    exampleTranslation: 'A rã verde salta perto do rio.',
  },

  // Objetos do Dia a Dia
  {
    key: 'book',
    word: 'BOOK',
    translation: 'Livro',
    phonetic: '/bʊk/',
    category: 'Objetos do Dia a Dia',
    difficulty: 'beginner',
    exampleSentence: 'Open your book to page ten.',
    exampleTranslation: 'Abre o teu livro na página dez.',
  },
  {
    key: 'cup',
    word: 'CUP',
    translation: 'Chávena',
    phonetic: '/kʌp/',
    category: 'Objetos do Dia a Dia',
    difficulty: 'beginner',
    exampleSentence: 'She holds a warm cup of tea.',
    exampleTranslation: 'Ela segura uma chávena quente de chá.',
  },
  {
    key: 'key',
    word: 'KEY',
    translation: 'Chave',
    phonetic: '/kiː/',
    category: 'Objetos do Dia a Dia',
    difficulty: 'elementary',
    exampleSentence: 'Use the silver key to open the door.',
    exampleTranslation: 'Usa a chave prateada para abrir a porta.',
  },
  {
    key: 'clock',
    word: 'CLOCK',
    translation: 'Relógio',
    phonetic: '/klɒk/',
    category: 'Objetos do Dia a Dia',
    difficulty: 'elementary',
    exampleSentence: 'The wall clock shows nine o’clock.',
    exampleTranslation: 'O relógio de parede marca nove horas.',
  },
  {
    key: 'phone',
    word: 'PHONE',
    translation: 'Telemóvel',
    phonetic: '/fəʊn/',
    category: 'Objetos do Dia a Dia',
    difficulty: 'beginner',
    exampleSentence: 'My phone is on the desk.',
    exampleTranslation: 'O meu telemóvel está em cima da secretária.',
  },
  {
    key: 'pencil',
    word: 'PENCIL',
    translation: 'Lápis',
    phonetic: '/ˈpen.səl/',
    category: 'Objetos do Dia a Dia',
    difficulty: 'elementary',
    exampleSentence: 'Write your name with a pencil.',
    exampleTranslation: 'Escreve o teu nome com um lápis.',
  },
  {
    key: 'chair',
    word: 'CHAIR',
    translation: 'Cadeira',
    phonetic: '/tʃeər/',
    category: 'Objetos do Dia a Dia',
    difficulty: 'elementary',
    exampleSentence: 'Please sit on the wooden chair.',
    exampleTranslation: 'Por favor senta-te na cadeira de madeira.',
  },
  {
    key: 'backpack',
    word: 'BACKPACK',
    translation: 'Mochila',
    phonetic: '/ˈbæk.pæk/',
    category: 'Objetos do Dia a Dia',
    difficulty: 'intermediate',
    exampleSentence: 'He carries books in his backpack.',
    exampleTranslation: 'Ele leva livros na sua mochila.',
  },

  // Natureza e Tempo
  {
    key: 'sun',
    word: 'SUN',
    translation: 'Sol',
    phonetic: '/sʌn/',
    category: 'Natureza e Tempo',
    difficulty: 'beginner',
    exampleSentence: 'The bright sun shines in the sky.',
    exampleTranslation: 'O sol brilhante ilumina o céu.',
  },
  {
    key: 'moon',
    word: 'MOON',
    translation: 'Lua',
    phonetic: '/muːn/',
    category: 'Natureza e Tempo',
    difficulty: 'beginner',
    exampleSentence: 'We see the moon at night.',
    exampleTranslation: 'Vemos a lua durante a noite.',
  },
  {
    key: 'star',
    word: 'STAR',
    translation: 'Estrela',
    phonetic: '/stɑːr/',
    category: 'Natureza e Tempo',
    difficulty: 'beginner',
    exampleSentence: 'Look at that shining star.',
    exampleTranslation: 'Olha para aquela estrela brilhante.',
  },
  {
    key: 'rain',
    word: 'RAIN',
    translation: 'Chuva',
    phonetic: '/reɪn/',
    category: 'Natureza e Tempo',
    difficulty: 'elementary',
    exampleSentence: 'The rain helps the flowers grow.',
    exampleTranslation: 'A chuva ajuda as flores a crescer.',
  },
  {
    key: 'tree',
    word: 'TREE',
    translation: 'Árvore',
    phonetic: '/triː/',
    category: 'Natureza e Tempo',
    difficulty: 'beginner',
    exampleSentence: 'There is a tall tree in the park.',
    exampleTranslation: 'Há uma árvore alta no parque.',
  },
  {
    key: 'flower',
    word: 'FLOWER',
    translation: 'Flor',
    phonetic: '/ˈflaʊ.ər/',
    category: 'Natureza e Tempo',
    difficulty: 'elementary',
    exampleSentence: 'This pink flower smells wonderful.',
    exampleTranslation: 'Esta flor cor-de-rosa cheira maravilhosamente.',
  },
  {
    key: 'cloud',
    word: 'CLOUD',
    translation: 'Nuvem',
    phonetic: '/klaʊd/',
    category: 'Natureza e Tempo',
    difficulty: 'intermediate',
    exampleSentence: 'A white cloud floats above the hill.',
    exampleTranslation: 'Uma nuvem branca flutua sobre a colina.',
  },
  {
    key: 'water',
    word: 'WATER',
    translation: 'Água',
    phonetic: '/ˈwɔː.tər/',
    category: 'Natureza e Tempo',
    difficulty: 'beginner',
    exampleSentence: 'Drink plenty of fresh water.',
    exampleTranslation: 'Bebe bastante água fresca.',
  },

  // Transportes
  {
    key: 'car',
    word: 'CAR',
    translation: 'Carro',
    phonetic: '/kɑːr/',
    category: 'Transportes',
    difficulty: 'beginner',
    exampleSentence: 'The blue car is parked outside.',
    exampleTranslation: 'O carro azul está estacionado lá fora.',
  },
  {
    key: 'bus',
    word: 'BUS',
    translation: 'Autocarro',
    phonetic: '/bʌs/',
    category: 'Transportes',
    difficulty: 'beginner',
    exampleSentence: 'I take the bus to school.',
    exampleTranslation: 'Apanho o autocarro para a escola.',
  },
  {
    key: 'train',
    word: 'TRAIN',
    translation: 'Comboio',
    phonetic: '/treɪn/',
    category: 'Transportes',
    difficulty: 'elementary',
    exampleSentence: 'The train arrives at the station.',
    exampleTranslation: 'O comboio chega à estação.',
  },
  {
    key: 'bicycle',
    word: 'BICYCLE',
    translation: 'Bicicleta',
    phonetic: '/ˈbaɪ.sɪ.kəl/',
    category: 'Transportes',
    difficulty: 'intermediate',
    exampleSentence: 'She rides her bicycle every weekend.',
    exampleTranslation: 'Ela anda de bicicleta todos os fins de semana.',
  },
  {
    key: 'plane',
    word: 'PLANE',
    translation: 'Avião',
    phonetic: '/pleɪn/',
    category: 'Transportes',
    difficulty: 'elementary',
    exampleSentence: 'The plane flies high in the clouds.',
    exampleTranslation: 'O avião voa alto nas nuvens.',
  },
  {
    key: 'boat',
    word: 'BOAT',
    translation: 'Barco',
    phonetic: '/bəʊt/',
    category: 'Transportes',
    difficulty: 'elementary',
    exampleSentence: 'The white boat sails across the bay.',
    exampleTranslation: 'O barco branco navega pela baía.',
  },

  // Casa e Vestuário
  {
    key: 'house',
    word: 'HOUSE',
    translation: 'Casa',
    phonetic: '/haʊs/',
    category: 'Casa e Vestuário',
    difficulty: 'beginner',
    exampleSentence: 'Our house has a red roof.',
    exampleTranslation: 'A nossa casa tem um telhado vermelho.',
  },
  {
    key: 'bed',
    word: 'BED',
    translation: 'Cama',
    phonetic: '/bed/',
    category: 'Casa e Vestuário',
    difficulty: 'beginner',
    exampleSentence: 'The bed is soft and comfortable.',
    exampleTranslation: 'A cama é macia e confortável.',
  },
  {
    key: 'table',
    word: 'TABLE',
    translation: 'Mesa',
    phonetic: '/ˈteɪ.bəl/',
    category: 'Casa e Vestuário',
    difficulty: 'elementary',
    exampleSentence: 'Put the plates on the table.',
    exampleTranslation: 'Põe os pratos em cima da mesa.',
  },
  {
    key: 'door',
    word: 'DOOR',
    translation: 'Porta',
    phonetic: '/dɔːr/',
    category: 'Casa e Vestuário',
    difficulty: 'elementary',
    exampleSentence: 'Close the wooden door quietly.',
    exampleTranslation: 'Fecha a porta de madeira devagar.',
  },
  {
    key: 'hat',
    word: 'HAT',
    translation: 'Chapéu',
    phonetic: '/hæt/',
    category: 'Casa e Vestuário',
    difficulty: 'beginner',
    exampleSentence: 'Wear a hat under the hot sun.',
    exampleTranslation: 'Usa um chapéu debaixo do sol quente.',
  },
  {
    key: 'shoe',
    word: 'SHOE',
    translation: 'Sapato',
    phonetic: '/ʃuː/',
    category: 'Casa e Vestuário',
    difficulty: 'elementary',
    exampleSentence: 'He tied his left shoe quickly.',
    exampleTranslation: 'Ele atou o sapato esquerdo rapidamente.',
  },
  {
    key: 'shirt',
    word: 'SHIRT',
    translation: 'Camisa',
    phonetic: '/ʃɜːt/',
    category: 'Casa e Vestuário',
    difficulty: 'intermediate',
    exampleSentence: 'She wears a clean blue shirt.',
    exampleTranslation: 'Ela veste uma camisa azul limpa.',
  },
  {
    key: 'umbrella',
    word: 'UMBRELLA',
    translation: 'Guarda-chuva',
    phonetic: '/ʌmˈbrel.ə/',
    category: 'Casa e Vestuário',
    difficulty: 'intermediate',
    exampleSentence: 'Take an umbrella when it rains.',
    exampleTranslation: 'Leva um guarda-chuva quando chover.',
  },
];

export const CATALOG_BY_KEY = new Map<string, CatalogItem>(
  VISUAL_CATALOG.map((item) => [item.key.toLowerCase(), item]),
);

export const CATALOG_BY_WORD = new Map<string, CatalogItem>(
  VISUAL_CATALOG.map((item) => [item.word.toUpperCase(), item]),
);

export const LEVEL_ROADMAP = [
  {
    level: 1,
    title: 'Nível 1 — Áudio → Imagem',
    subtitle: 'Reconhecimento Auditivo',
    description:
      'Ouve a pronúncia em inglês e associa a palavra à imagem correta entre quatro opções visuais.',
    mode: 'audio_to_image' as const,
    isMvpImplemented: true,
  },
  {
    level: 2,
    title: 'Nível 2 — Imagem → Palavra',
    subtitle: 'Reconhecimento Visual e Escrito',
    description:
      'Observa a ilustração apresentada e identifica a palavra inglesa correspondente entre quatro alternativas.',
    mode: 'image_to_word' as const,
    isMvpImplemented: true,
  },
  {
    level: 3,
    title: 'Nível 3 — Vocabulário e Traduções',
    subtitle: 'Expansão Lexical',
    description:
      'Associação direta entre vocabulário inglês, traduções em português e contexto de utilização.',
    mode: 'planned' as const,
    isMvpImplemented: false,
  },
  {
    level: 4,
    title: 'Nível 4 — Construção de Frases',
    subtitle: 'Sintaxe Básica',
    description:
      'Organização interativa de blocos de palavras para formar frases simples em inglês.',
    mode: 'planned' as const,
    isMvpImplemented: false,
  },
  {
    level: 5,
    title: 'Nível 5 — Compreensão Auditiva',
    subtitle: 'Frases Completas',
    description:
      'Audição de frases completas em inglês com identificação do significado e intenção.',
    mode: 'planned' as const,
    isMvpImplemented: false,
  },
  {
    level: 6,
    title: 'Nível 6 — Completar Frases e Textos',
    subtitle: 'Aplicação Contextual',
    description:
      'Preenchimento de lacunas em frases e pequenos diálogos do quotidiano.',
    mode: 'planned' as const,
    isMvpImplemented: false,
  },
  {
    level: 7,
    title: 'Nível 7 — Compreensão Avançada',
    subtitle: 'Leitura e Áudio Complexos',
    description:
      'Interpretação de pequenos textos e registos auditivos mais ricos com revisão adaptativa.',
    mode: 'planned' as const,
    isMvpImplemented: false,
  },
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Validates raw questions (e.g. from Gemini or storage) to guarantee:
 * - Exactly 10 valid questions (or rejects malformed batches)
 * - Known catalog words & image keys (zero broken visuals)
 * - Exactly 4 unique options
 * - Exact match of correctAnswer inside options
 */
export function validateExerciseQuestions(
  rawQuestions: unknown,
  level: number,
  defaultDifficulty: DifficultyTier,
): { valid: boolean; questions: ExerciseQuestion[]; reason?: string } {
  if (!Array.isArray(rawQuestions) || rawQuestions.length !== 10) {
    return {
      valid: false,
      questions: [],
      reason: `Expected 10 questions, received ${Array.isArray(rawQuestions) ? rawQuestions.length : 'non-array'}`,
    };
  }

  const seenTargetWords = new Set<string>();
  const validated: ExerciseQuestion[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const item = rawQuestions[i] as Record<string, unknown>;
    if (!item || typeof item !== 'object') {
      return { valid: false, questions: [], reason: `Question ${i + 1} is not an object` };
    }

    const rawWord = String(item.word ?? '').trim().toUpperCase();
    const catalogEntry = CATALOG_BY_WORD.get(rawWord);
    if (!catalogEntry) {
      return {
        valid: false,
        questions: [],
        reason: `Question ${i + 1} word "${rawWord}" is not in visual catalog`,
      };
    }

    if (seenTargetWords.has(catalogEntry.word)) {
      return {
        valid: false,
        questions: [],
        reason: `Duplicate target word "${catalogEntry.word}" in batch`,
      };
    }
    seenTargetWords.add(catalogEntry.word);

    const rawOptions = Array.isArray(item.options) ? item.options : [];
    const normalizedOptions = rawOptions
      .map((opt) => String(opt ?? '').trim().toUpperCase())
      .filter((opt) => CATALOG_BY_WORD.has(opt));

    const uniqueOptions = Array.from(new Set(normalizedOptions));
    if (uniqueOptions.length !== 4) {
      return {
        valid: false,
        questions: [],
        reason: `Question ${i + 1} does not have 4 unique valid options`,
      };
    }

    const rawCorrect = String(item.correctAnswer ?? catalogEntry.word).trim().toUpperCase();
    if (rawCorrect !== catalogEntry.word || !uniqueOptions.includes(rawCorrect)) {
      return {
        valid: false,
        questions: [],
        reason: `Question ${i + 1} correctAnswer mismatch`,
      };
    }

    const difficultyRaw = String(item.difficulty ?? defaultDifficulty);
    const difficulty: DifficultyTier =
      difficultyRaw === 'beginner' ||
      difficultyRaw === 'elementary' ||
      difficultyRaw === 'intermediate'
        ? difficultyRaw
        : defaultDifficulty;

    validated.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `q-${crypto.randomUUID()}`,
      level,
      word: catalogEntry.word,
      translation:
        typeof item.translation === 'string' && item.translation.trim()
          ? item.translation.trim()
          : catalogEntry.translation,
      phonetic:
        typeof item.phonetic === 'string' && item.phonetic.trim()
          ? item.phonetic.trim()
          : catalogEntry.phonetic,
      category: catalogEntry.category,
      imageKey: catalogEntry.key,
      audioText: catalogEntry.word,
      exampleSentence:
        typeof item.exampleSentence === 'string' && item.exampleSentence.trim()
          ? item.exampleSentence.trim()
          : catalogEntry.exampleSentence,
      exampleTranslation:
        typeof item.exampleTranslation === 'string' && item.exampleTranslation.trim()
          ? item.exampleTranslation.trim()
          : catalogEntry.exampleTranslation,
      hintPt:
        typeof item.hintPt === 'string' && item.hintPt.trim()
          ? item.hintPt.trim()
          : `Categoria: ${catalogEntry.category}.`,
      options: uniqueOptions,
      correctAnswer: catalogEntry.word,
      difficulty,
    });
  }

  return { valid: true, questions: validated };
}

/**
 * Deterministic-safe curated fallback batch builder when Gemini is unavailable.
 * Respects weak words if provided, avoids duplicate targets, ensures 4 same-category
 * or closely related distractors, and runs through the exact same validator.
 */
export function buildCuratedFallbackBatch(
  level: number,
  difficulty: DifficultyTier,
  weakWords: string[] = [],
): ExerciseQuestion[] {
  const weakSet = new Set(weakWords.map((w) => w.toUpperCase()));

  // Prioritize weak words + level-appropriate starter words (APPLE for L1, DOG for L2)
  const priorityAnchor = level === 1 ? 'APPLE' : 'DOG';
  const sortedCatalog = [...VISUAL_CATALOG].sort((a, b) => {
    if (a.word === priorityAnchor) return -1;
    if (b.word === priorityAnchor) return 1;
    const aWeak = weakSet.has(a.word) ? 0 : 1;
    const bWeak = weakSet.has(b.word) ? 0 : 1;
    if (aWeak !== bWeak) return aWeak - bWeak;

    const tierOrder: Record<DifficultyTier, number> = {
      beginner: 0,
      elementary: 1,
      intermediate: 2,
    };
    const targetTier = tierOrder[difficulty];
    return Math.abs(tierOrder[a.difficulty] - targetTier) - Math.abs(tierOrder[b.difficulty] - targetTier);
  });

  // Mix top items with slight randomization after anchor so repeated attempts feel fresh
  const anchor = sortedCatalog[0];
  const restPool = shuffleArray(sortedCatalog.slice(1, 22));
  const selectedTargets = [anchor, ...restPool.slice(0, 9)];

  const questions: ExerciseQuestion[] = selectedTargets.map((target, idx) => {
    const sameCategory = shuffleArray(
      VISUAL_CATALOG.filter((item) => item.category === target.category && item.word !== target.word),
    );
    const otherCategory = shuffleArray(
      VISUAL_CATALOG.filter((item) => item.category !== target.category && item.word !== target.word),
    );
    const distractors = [...sameCategory, ...otherCategory].slice(0, 3).map((d) => d.word);
    const options = shuffleArray([target.word, ...distractors]);

    return {
      id: `curated-l${level}-${idx + 1}-${crypto.randomUUID().slice(0, 8)}`,
      level,
      word: target.word,
      translation: target.translation,
      phonetic: target.phonetic,
      category: target.category,
      imageKey: target.key,
      audioText: target.word,
      exampleSentence: target.exampleSentence,
      exampleTranslation: target.exampleTranslation,
      hintPt: `Esta palavra pertence ao tema "${target.category}".`,
      options,
      correctAnswer: target.word,
      difficulty: target.difficulty,
    };
  });

  const check = validateExerciseQuestions(questions, level, difficulty);
  if (!check.valid) {
    throw new Error(`Curated fallback validation failed: ${check.reason}`);
  }
  return check.questions;
}

/**
 * Builds an independent 5-question Life Recovery Challenge directly from VISUAL_CATALOG
 * (0 Gemini API calls), mixing Audio -> Image (level 1) and Image -> Word (level 2).
 */
export function buildRecoveryChallengeQuestions(): ExerciseQuestion[] {
  const pool = shuffleArray(VISUAL_CATALOG);
  const selectedTargets = pool.slice(0, 5);

  return selectedTargets.map((target, idx) => {
    const modeLevel = idx % 2 === 0 ? 1 : 2;
    const sameCategory = shuffleArray(
      VISUAL_CATALOG.filter((item) => item.category === target.category && item.word !== target.word),
    );
    const otherCategory = shuffleArray(
      VISUAL_CATALOG.filter((item) => item.category !== target.category && item.word !== target.word),
    );
    const distractors = [...sameCategory, ...otherCategory].slice(0, 3).map((d) => d.word);
    const options = shuffleArray([target.word, ...distractors]);

    return {
      id: `recovery-q${idx + 1}-${crypto.randomUUID().slice(0, 8)}`,
      level: modeLevel,
      word: target.word,
      translation: target.translation,
      phonetic: target.phonetic,
      category: target.category,
      imageKey: target.key,
      audioText: target.word,
      exampleSentence: target.exampleSentence,
      exampleTranslation: target.exampleTranslation,
      hintPt: `Desafio de recuperação · Tema "${target.category}".`,
      options,
      correctAnswer: target.word,
      difficulty: target.difficulty,
    };
  });
}
