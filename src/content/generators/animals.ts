import type { Generator, Grade, Tier, Riddle } from '../types'
import type { Rng } from '../../engine/rng'
import { riddle, shuffled, choiceCount, cap, an, numberWord, sayChoices, Choice} from '../types'
import { ANIMALS, ANIMAL_FACTS, KNOWN_BABIES, CLASS_NAMES, TRICKY, type Animal, type AnimalClass, type Habitat } from '../data/animals'
import { factRiddle, wrap } from './thinkingUtil'

export const HABITAT_TEXT: Record<Habitat, string> = {
  farm: 'on a farm', forest: 'in a forest', ocean: 'in the ocean', desert: 'in a hot desert', Arctic: 'in the Arctic', Antarctic: 'in Antarctica',
  rainforest: 'in a rainforest', grassland: 'on the grasslands', pond: 'in a pond', garden: 'in a garden', river: 'in a river', cave: 'in a cave', mountains: 'in the mountains',
}
/** Habitats that are too alike to serve as decoys for each other. */
export const HAB_GROUP: Record<Habitat, string> = {
  farm: 'open', grassland: 'open', garden: 'open', forest: 'forest', rainforest: 'forest', pond: 'fresh', river: 'fresh', ocean: 'sea',
  desert: 'desert', Arctic: 'cold', Antarctic: 'cold', cave: 'cave', mountains: 'mountains',
}

export const CLASS_TEXT: Record<AnimalClass, string> = {
  mammal: 'a mammal', bird: 'a bird', reptile: 'a reptile', fish: 'a fish', insect: 'an insect', amphibian: 'an amphibian',
  arachnid: 'an arachnid', mollusc: 'a mollusc', crustacean: 'a crustacean', worm: 'a worm',
}
export const INVERTEBRATE: AnimalClass[] = ['insect', 'arachnid', 'mollusc', 'crustacean', 'worm']

// ---------------------------------------------------------------------------- "is it also true?"
// Everything below decides whether a value is *defensible* for an animal, not just whether it is the
// value the table happens to store. A decoy is only allowed when the answer is wrong under every
// reading a well-taught child could have.

export const says = (a: Animal, sound: string): boolean => a.sound === sound || !!a.soundAlso?.includes(sound)
export const callsBaby = (a: Animal, baby: string): boolean => a.baby === baby || !!a.babyAlso?.includes(baby)
export const livesInHome = (a: Animal, home: string): boolean => a.home === home || !!a.homeAlso?.includes(home)
export const inGroup = (a: Animal, group: string): boolean => a.group === group || !!a.groupAlso?.includes(group)
export const livesIn = (a: Animal, hab: Habitat): boolean => a.hab === hab || !!a.habAlso?.includes(hab)

const texts = (cs: Choice[]): string => sayChoices(cs)

/** Difficulty: the grade sets the band, the tier sets the step inside it, `extra` orders the types. */
const metricFor = (grade: Grade, tier: Tier, extra: number) => grade * 10 + tier * 2 + extra

function build(grade: Grade, tier: Tier, extra: number, skill: string, prompt: string[], spoken: string, answer: string, decoys: string[], rng: Rng, key: string): Riddle {
  const n = choiceCount(grade)
  const { choices, answer: idx } = shuffled(rng, answer, rng.shuffle(decoys), n)
  return riddle({
    family: 'animals', skill, prompt, choices, answer: idx, spoken: `${spoken} ${texts(choices)}?`,
    metric: metricFor(grade, tier, extra), grade, tier, key: `animals|${key}`,
  })
}

// ------------------------------------------------------------------------------- K: sounds, babies

function soundQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.sound)
  const a = rng.pick(pool)
  if (rng.bool()) {
    // No bird is ever a decoy for "chirp", and nothing that also makes the sound can be offered.
    const decoys = pool.filter(x => !says(x, a.sound!)).map(x => x.n)
    const prompt = rng.pick([[`Which animal says "${a.sound}"?`], ['Listen! I hear an animal.', `It says "${a.sound}". Which animal is it?`]])
    return build(grade, tier, 0, 'science: animal sounds', prompt, `Which animal says ${a.sound}?`, a.n, decoys, rng, `sound-who|${a.sound}`)
  }
  const decoys = [...new Set(pool.map(x => x.sound!))].filter(s => !says(a, s))
  const prompt = rng.pick([[`What does ${an(a.n)} say?`], [`Here comes ${an(a.n)}!`, 'What sound does it make?']])
  return build(grade, tier, 0, 'science: animal sounds', prompt, `What does ${an(a.n)} say?`, a.sound!, decoys, rng, `sound-what|${a.n}`)
}

const babyPool = () => ANIMALS.filter(a => a.baby && KNOWN_BABIES.includes(a.baby))

function babyForwardQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const a = rng.pick(babyPool())
  const decoys = KNOWN_BABIES.filter(b => !callsBaby(a, b))
  const prompt = rng.pick([[`A baby ${a.n} is called a ...`], [`What do we call a baby ${a.n}?`]])
  return build(grade, tier, 0.5, 'science: baby animals', prompt, `What do we call a baby ${a.n}?`, a.baby!, decoys, rng, `baby-name|${a.n}`)
}

function babyReverseQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  // "A duckling is a baby ..." gives itself away, so those pairs are only asked the other way round.
  const pool = babyPool().filter(a => !a.baby!.includes(a.n))
  const a = rng.pick(pool)
  const decoys = pool.filter(x => !callsBaby(x, a.baby!)).map(x => x.n)
  return build(grade, tier, 1, 'science: baby animals', [`A ${a.baby} is a baby ...`], `A ${a.baby} is a baby what?`, a.n, decoys, rng, `baby-who|${a.baby}|${a.n}`)
}

/** K's hardest sort: a body-covering or an ability rather than a name to remember. */
function traitQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const kind = rng.pick(['feathers', 'fur', 'fly'] as const)
  if (kind === 'feathers') {
    const a = rng.pick(ANIMALS.filter(x => x.cls === 'bird'))
    const decoys = ANIMALS.filter(x => x.cls !== 'bird').map(x => x.n)
    return build(grade, tier, 1.5, 'science: animal bodies', ['Which animal has feathers?'], 'Which animal has feathers?', a.n, decoys, rng, `trait-who|feathers|${a.n}`)
  }
  if (kind === 'fur') {
    const a = rng.pick(ANIMALS.filter(x => x.furry))
    const decoys = ANIMALS.filter(x => x.cls !== 'mammal').map(x => x.n)
    return build(grade, tier, 1.5, 'science: animal bodies', ['Which animal has fur?'], 'Which animal has fur?', a.n, decoys, rng, `trait-who|fur|${a.n}`)
  }
  const a = rng.pick(ANIMALS.filter(x => x.flies))
  // Only animals that plainly cannot fly: no birds and no insects, however weak their wings.
  const decoys = ANIMALS.filter(x => !x.flies && x.cls !== 'bird' && x.cls !== 'insect').map(x => x.n)
  return build(grade, tier, 1.5, 'science: animal bodies', ['Which animal can fly?'], 'Which animal can fly?', a.n, decoys, rng, `trait-who|fly|${a.n}`)
}

// ------------------------------------------------------------- grade 1: homes, groups, counting legs

const inHome = (h: string) => h === 'soil' ? 'in the soil' : `in ${an(h)}`

function homeQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.home)
  const a = rng.pick(pool)
  if (rng.bool()) {
    const decoys = [...new Set(pool.map(x => x.home!))].filter(h => !livesInHome(a, h)).map(inHome)
    return build(grade, tier, 0.5, 'science: animal homes', [`Where does ${an(a.n)} live?`], `Where does ${an(a.n)} live?`, inHome(a.home!), decoys, rng, `home-where|${a.n}`)
  }
  const decoys = ANIMALS.filter(x => !livesInHome(x, a.home!)).map(x => x.n)
  return build(grade, tier, 0.5, 'science: animal homes', [`Which animal lives ${inHome(a.home!)}?`], `Which animal lives ${inHome(a.home!)}?`, a.n, decoys, rng, `home-who|${a.home}`)
}

/** "A group of tuna", not "a group of tunas": plurals come from the data where they are irregular. */
const pluralOf = (a: Animal): string => a.plural ?? (a.n.endsWith('s') ? a.n : /[^aeiou]y$/.test(a.n) ? a.n.slice(0, -1) + 'ies' : a.n + 's')
/** Fish swim in a school, they do not live in one. */
const groupVerb = (g: string) => g === 'school' || g === 'pod' ? `swims in a ${g}` : g === 'swarm' ? `flies in a ${g}` : `lives in a ${g}`

function groupQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.group)
  const a = rng.pick(pool)
  if (rng.bool()) {
    const decoys = [...new Set(pool.map(x => x.group!))].filter(g => !inGroup(a, g))
    const plural = pluralOf(a)
    return build(grade, tier, 1, 'science: animal groups', [`A group of ${plural} is called a ...`], `A group of ${plural} is called a what?`, a.group!, decoys, rng, `group-name|${a.n}`)
  }
  const decoys = ANIMALS.filter(x => !inGroup(x, a.group!)).map(x => x.n)
  const q = `Which animal ${groupVerb(a.group!)}?`
  return build(grade, tier, 1, 'science: animal groups', wrap(q), q, a.n, decoys, rng, `group-who|${a.group}`)
}

const legWord = (n: number) => n === 0 ? 'none' : numberWord(n)

function legsQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.legs !== undefined)
  const a = rng.pick(pool)
  if (rng.bool()) {
    const decoys = [...new Set(pool.map(x => x.legs!))].filter(l => l !== a.legs).map(legWord)
    return build(grade, tier, 1.5, 'science: animal bodies', [`How many legs does ${an(a.n)} have?`], `How many legs does ${an(a.n)} have?`, legWord(a.legs!), decoys, rng, `legs-count|${a.n}`)
  }
  const decoys = pool.filter(x => x.legs !== a.legs).map(x => x.n)
  const q = a.legs === 0 ? 'Which animal has no legs?' : `Which animal has ${numberWord(a.legs!)} legs?`
  return build(grade, tier, 1.5, 'science: animal bodies', [q], q, a.n, decoys, rng, `legs-who|${a.legs}`)
}

// ------------------------------------------------------- grade 2: classes and what animals eat

/** `mode` 'easy' keeps to animals a 7-year-old sorts right; 'tricky' is the bat/whale/spider set. */
function classQ(grade: Grade, tier: Tier, extra: number, mode: 'easy' | 'tricky', rng: Rng): Riddle {
  const easyOk = (x: Animal) => !TRICKY.includes(x.n) && CLASS_NAMES.includes(x.cls)
  // "Which of these is a fish?" must never be answered by a *fish, so names that carry their own
  // class ("clownfish", "goldfish") are not used as the answer.
  const answers = mode === 'easy'
    ? ANIMALS.filter(x => easyOk(x) && !x.n.includes(x.cls))
    : ANIMALS.filter(x => TRICKY.includes(x.n) && !x.n.includes(x.cls))
  const a = rng.pick(answers)
  const cls = a.cls
  if (rng.bool(0.5)) {
    const decoys = ANIMALS.filter(x => x.cls !== cls && (mode === 'tricky' || easyOk(x))).map(x => x.n)
    return build(grade, tier, extra, 'science: animal classes', [`Which of these is ${CLASS_TEXT[cls]}?`], `Which of these is ${CLASS_TEXT[cls]}?`, a.n, decoys, rng, `class-who|${cls}|${a.n}`)
  }
  const decoys = CLASS_NAMES.filter(c => c !== cls).map(c => CLASS_TEXT[c])
  return build(grade, tier, extra, 'science: animal classes', [`${cap(an(a.n))} is ...`], `${cap(an(a.n))} is what kind of animal?`, CLASS_TEXT[cls], decoys, rng, `class-what|${a.n}`)
}

function dietQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.diet)
  const a = rng.pick(pool)
  if (rng.bool(0.5)) {
    const what = a.diet === 'herbivore' ? 'only plants' : a.diet === 'carnivore' ? 'only meat' : 'plants and meat'
    const decoys = pool.filter(x => x.diet !== a.diet).map(x => x.n)
    const q = `Which animal eats ${what}?`
    return build(grade, tier, 1, 'science: what animals eat', [q], q, a.n, decoys, rng, `diet-who|${a.diet}|${a.n}`)
  }
  const eats = a.diet === 'herbivore' ? 'plants' : a.diet === 'carnivore' ? 'meat' : 'plants and meat'
  // "a producer" is only a decoy once food chains have been taught (grade 3 and up).
  const words = ['a herbivore', 'a carnivore', 'an omnivore', ...(grade >= 3 ? ['a producer'] : [])]
  return build(grade, tier, 1, 'science: what animals eat', [`${cap(an(a.n))} eats ${eats}.`, 'It is ...'], `${cap(an(a.n))} eats ${eats}. It is what?`, an(a.diet!), words.filter(d => d !== an(a.diet!)), rng, `diet-what|${a.n}`)
}

// ------------------------------------------------------------ grade 4: habitats; grade 5: backbones

function habitatQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.hab && !a.vague)
  const a = rng.pick(pool)
  const hab = a.hab!
  if (rng.bool(0.6)) {
    const decoys = pool.filter(x => HAB_GROUP[x.hab!] !== HAB_GROUP[hab] && !livesIn(x, hab)).map(x => x.n)
    return build(grade, tier, 0.5, 'science: habitats', [`Which animal lives ${HABITAT_TEXT[hab]}?`], `Which animal lives ${HABITAT_TEXT[hab]}?`, a.n, decoys, rng, `hab-who|${hab}|${a.n}`)
  }
  const decoys = (Object.keys(HABITAT_TEXT) as Habitat[]).filter(h => HAB_GROUP[h] !== HAB_GROUP[hab] && !livesIn(a, h)).map(h => HABITAT_TEXT[h])
  return build(grade, tier, 0.5, 'science: habitats', [`Where would you find ${an(a.n)} living?`], `Where would you find ${an(a.n)} living?`, HABITAT_TEXT[hab], decoys, rng, `hab-where|${a.n}`)
}

const VERT_STEMS: [boolean, string[]][] = [
  [false, ['Which of these is a vertebrate?', '(A vertebrate has a backbone.)']],
  [false, ['Which of these animals has a backbone?']],
  [true, ['Which of these is an invertebrate?', '(An invertebrate has no backbone.)']],
  [true, ['Which of these animals has no backbone?']],
]

function classifyQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const [inv, prompt] = rng.pick(VERT_STEMS)
  const a = rng.pick(ANIMALS.filter(x => INVERTEBRATE.includes(x.cls) === inv))
  const decoys = ANIMALS.filter(x => INVERTEBRATE.includes(x.cls) !== inv).map(x => x.n)
  const word = inv ? 'an invertebrate' : 'a vertebrate'
  return build(grade, tier, 1.5, 'science: classification', prompt, `Which of these is ${word}?`, a.n, decoys, rng, `vert-who|${word}|${a.n}`)
}

// ------------------------------------------------------------------------------------- the family

const facts = (level: Grade, bands: (1 | 2 | 3)[]) => ANIMAL_FACTS.filter(f => f.level === level && bands.includes(f.band ?? 1))

/** A fact riddle, re-stamped with this family's own (grade, tier) metric so the ramp stays honest. */
function factQ(grade: Grade, tier: Tier, level: Grade, bands: (1 | 2 | 3)[], rng: Rng): Riddle {
  const pool = facts(level, bands)
  const r = factRiddle('animals', 'science: animals', pool, grade, tier, rng, level)
  const band = ANIMAL_FACTS.find(f => `animals|${f.q}` === r.key)?.band ?? 1
  return { ...r, metric: metricFor(grade, tier, band * 0.5) }
}

/**
 * Animals: sounds, babies and bodies (K), homes, groups and legs (1), classes and diets (2),
 * adaptations (3), habitats and food chains (4), ecosystems, life cycles and classification (5).
 *
 * Each (grade, tier) draws from its own list of question types, and tier 1 and tier 3 of a grade
 * never share one: the hardest version of a grade can never ask what the easiest version asked, and
 * no grade is built out of the grade below it.
 */
export const animals: Generator = {
  id: 'animals',
  name: 'Animals',
  area: 'thinking',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.5, 1: 1.5, 2: 1.2, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const one = <T>(...fns: (() => T)[]): T => rng.pick(fns)()
    switch (grade) {
      case 0:
        if (tier === 1) return soundQ(grade, tier, rng)
        if (tier === 2) return one(() => soundQ(grade, tier, rng), () => babyForwardQ(grade, tier, rng))
        return one(() => babyForwardQ(grade, tier, rng), () => babyReverseQ(grade, tier, rng), () => traitQ(grade, tier, rng))
      case 1:
        if (tier === 1) return homeQ(grade, tier, rng)
        if (tier === 2) return one(() => homeQ(grade, tier, rng), () => groupQ(grade, tier, rng))
        return one(() => groupQ(grade, tier, rng), () => legsQ(grade, tier, rng))
      case 2:
        if (tier === 1) return classQ(grade, tier, 0.5, 'easy', rng)
        if (tier === 2) return one(() => classQ(grade, tier, 0.5, 'easy', rng), () => dietQ(grade, tier, rng))
        return one(() => dietQ(grade, tier, rng), () => factQ(grade, tier, 2, [1, 2, 3], rng))
      case 3:
        if (tier === 1) return factQ(grade, tier, 3, [1, 2], rng)
        if (tier === 2) return factQ(grade, tier, 3, [1, 2, 3], rng)
        return rng.bool(0.6) ? factQ(grade, tier, 3, [3], rng) : classQ(grade, tier, 1.5, 'tricky', rng)
      case 4:
        if (tier === 1) return habitatQ(grade, tier, rng)
        if (tier === 2) return one(() => habitatQ(grade, tier, rng), () => factQ(grade, tier, 4, [1, 2], rng))
        return factQ(grade, tier, 4, [2, 3], rng)
      default:
        if (tier === 1) return factQ(grade, tier, 5, [1, 2], rng)
        if (tier === 2) return rng.bool(0.7) ? factQ(grade, tier, 5, [1, 2, 3], rng) : classifyQ(grade, tier, rng)
        return rng.bool(0.6) ? factQ(grade, tier, 5, [3], rng) : classifyQ(grade, tier, rng)
    }
  },
}
