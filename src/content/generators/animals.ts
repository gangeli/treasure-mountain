import type { Generator, Grade, Tier, Riddle } from '../types'
import type { Rng } from '../../engine/rng'
import { riddle, shuffled, choiceCount, cap, an } from '../types'
import { ANIMALS, ANIMAL_FACTS, KNOWN_BABIES, CLASS_NAMES, type Animal, type AnimalClass, type Habitat } from '../data/animals'
import { factRiddle, pickLevel, wrap } from './thinkingUtil'

/** Animals whose class surprises younger children (a bat is a mammal...). Only used from grade 4 up. */
const TRICKY = new Set(['bat', 'whale', 'dolphin', 'platypus', 'penguin', 'ostrich', 'seal', 'turtle', 'tortoise', 'sloth'])

const HABITAT_TEXT: Record<Habitat, string> = {
  farm: 'on a farm', forest: 'in a forest', ocean: 'in the ocean', desert: 'in a hot desert', Arctic: 'in the Arctic', Antarctic: 'in Antarctica',
  rainforest: 'in a rainforest', grassland: 'on the grasslands', pond: 'in a pond', garden: 'in a garden', river: 'in a river', cave: 'in a cave', mountains: 'in the mountains',
}
/** Habitats that are too alike to serve as decoys for each other. */
const HAB_GROUP: Record<Habitat, string> = {
  farm: 'open', grassland: 'open', garden: 'open', forest: 'forest', rainforest: 'forest', pond: 'fresh', river: 'fresh', ocean: 'sea',
  desert: 'desert', Arctic: 'cold', Antarctic: 'cold', cave: 'cave', mountains: 'mountains',
}

const CLASS_TEXT: Record<AnimalClass, string> = {
  mammal: 'a mammal', bird: 'a bird', reptile: 'a reptile', fish: 'a fish', insect: 'an insect', amphibian: 'an amphibian',
  arachnid: 'an arachnid', mollusc: 'a mollusc', crustacean: 'a crustacean', worm: 'a worm',
}
const INVERTEBRATE: AnimalClass[] = ['insect', 'arachnid', 'mollusc', 'crustacean', 'worm']

const texts = (cs: { text?: string }[]) => cs.map(c => c.text).join(', ')

function build(grade: Grade, tier: Tier, level: number, skill: string, prompt: string[], spoken: string, answer: string, decoys: string[], rng: Rng, bonus: number, key: string): Riddle {
  const n = choiceCount(grade)
  const { choices, answer: idx } = shuffled(rng, answer, rng.shuffle(decoys), n)
  return riddle({ family: 'animals', skill, prompt, choices, answer: idx, spoken: `${spoken} ${texts(choices)}?`, metric: level * 10 + bonus, grade, tier, key: `animals|${key}` })
}

function soundQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.sound)
  const a = rng.pick(pool)
  if (rng.bool()) {
    const decoys = pool.filter(x => x.sound !== a.sound).map(x => x.n)
    const prompt = rng.pick([[`Which animal says "${a.sound}"?`], ['Listen! I hear an animal.', `It says "${a.sound}". Which animal is it?`]])
    return build(grade, tier, 0, 'science: animal sounds', prompt, `Which animal says ${a.sound}?`, a.n, decoys, rng, 1, `sound|${a.sound}`)
  }
  const decoys = [...new Set(pool.filter(x => x.sound !== a.sound).map(x => x.sound!))]
  const prompt = rng.pick([[`What does ${an(a.n)} say?`], [`Here comes ${an(a.n)}!`, 'What sound does it make?']])
  return build(grade, tier, 0, 'science: animal sounds', prompt, `What does ${an(a.n)} say?`, a.sound!, decoys, rng, 1, `sound|${a.n}`)
}

function babyQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.baby && KNOWN_BABIES.includes(a.baby))
  const a = rng.pick(pool)
  if (rng.bool(0.6)) {
    const decoys = KNOWN_BABIES.filter(b => b !== a.baby)
    const prompt = rng.pick([[`A baby ${a.n} is called a ...`], [`What do we call a baby ${a.n}?`]])
    return build(grade, tier, 0, 'science: baby animals', prompt, `What do we call a baby ${a.n}?`, a.baby!, decoys, rng, 2, `baby|${a.n}`)
  }
  const decoys = pool.filter(x => x.baby !== a.baby).map(x => x.n)
  return build(grade, tier, 0, 'science: baby animals', [`A ${a.baby} is a baby ...`], `A ${a.baby} is a baby what?`, a.n, decoys, rng, 2, `baby|${a.baby}`)
}

const inHome = (h: string) => h === 'soil' ? 'in the soil' : `in ${an(h)}`

function homeQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.home)
  const a = rng.pick(pool)
  if (rng.bool()) {
    const decoys = [...new Set(pool.filter(x => x.home !== a.home).map(x => inHome(x.home!)))]
    return build(grade, tier, 1, 'science: animal homes', [`Where does ${an(a.n)} live?`], `Where does ${an(a.n)} live?`, inHome(a.home!), decoys, rng, 1, `home|${a.n}`)
  }
  const decoys = pool.filter(x => x.home !== a.home).map(x => x.n)
  return build(grade, tier, 1, 'science: animal homes', [`Which animal lives ${inHome(a.home!)}?`], `Which animal lives ${inHome(a.home!)}?`, a.n, decoys, rng, 1, `home|${a.home}`)
}

function groupQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.group)
  const a = rng.pick(pool)
  if (rng.bool()) {
    const decoys = [...new Set(pool.filter(x => x.group !== a.group).map(x => x.group!))]
    const plural = a.n.endsWith('s') ? a.n : a.n === 'wolf' ? 'wolves' : a.n === 'goose' ? 'geese' : a.n === 'mouse' ? 'mice' : a.n === 'sheep' ? 'sheep' : a.n.endsWith('y') ? a.n.slice(0, -1) + 'ies' : a.n + 's'
    return build(grade, tier, 1, 'science: animal groups', [`A group of ${plural} is called a ...`], `A group of ${plural} is called a what?`, a.group!, decoys, rng, 3, `group|${a.n}`)
  }
  const decoys = pool.filter(x => x.group !== a.group).map(x => x.n)
  return build(grade, tier, 1, 'science: animal groups', [`Which animal lives in a ${a.group}?`], `Which animal lives in a ${a.group}?`, a.n, decoys, rng, 3, `group|${a.group}`)
}

function classQ(grade: Grade, tier: Tier, level: number, rng: Rng): Riddle {
  const hardMode = level >= 4
  const ok = (a: Animal) => hardMode || !TRICKY.has(a.n)
  const cls = rng.pick(CLASS_NAMES)
  const members = ANIMALS.filter(a => a.cls === cls && ok(a) && (!hardMode || TRICKY.has(a.n) || rng.bool(0.3)))
  const a = rng.pick(members.length ? members : ANIMALS.filter(x => x.cls === cls && ok(x)))
  if (rng.bool(0.5)) {
    const decoys = ANIMALS.filter(x => x.cls !== cls && ok(x) && (hardMode ? true : CLASS_NAMES.includes(x.cls))).map(x => x.n)
    return build(grade, tier, level, 'science: animal classes', [`Which of these is ${CLASS_TEXT[cls]}?`], `Which of these is ${CLASS_TEXT[cls]}?`, a.n, decoys, rng, 2, `class|${cls}|${a.n}`)
  }
  const decoys = CLASS_NAMES.filter(c => c !== cls).map(c => CLASS_TEXT[c])
  return build(grade, tier, level, 'science: animal classes', [`${cap(an(a.n))} is ...`], `${cap(an(a.n))} is what kind of animal?`, CLASS_TEXT[cls], decoys, rng, 2, `class|${a.n}`)
}

function dietQ(grade: Grade, tier: Tier, level: number, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.diet)
  const a = rng.pick(pool)
  if (rng.bool(0.5)) {
    const what = a.diet === 'herbivore' ? 'only plants' : a.diet === 'carnivore' ? 'only meat' : 'both plants and meat'
    const decoys = pool.filter(x => x.diet !== a.diet).map(x => x.n)
    return build(grade, tier, level, 'science: what animals eat', wrap(`Which of these animals eats ${what}?`), `Which of these animals eats ${what}?`, a.n, decoys, rng, 3, `diet|${a.diet}|${a.n}`)
  }
  const eats = a.diet === 'herbivore' ? 'plants' : a.diet === 'carnivore' ? 'meat' : 'plants and meat'
  return build(grade, tier, level, 'science: what animals eat', [`${cap(an(a.n))} eats ${eats}.`, 'It is ...'], `${cap(an(a.n))} eats ${eats}. It is what?`, an(a.diet!), ['a herbivore', 'a carnivore', 'an omnivore', 'a producer'].filter(d => d !== an(a.diet!)), rng, 3, `diet|${a.n}`)
}

function habitatQ(grade: Grade, tier: Tier, level: number, rng: Rng): Riddle {
  const pool = ANIMALS.filter(a => a.hab && !a.vague)
  const a = rng.pick(pool)
  const hab = a.hab!
  if (rng.bool(0.6)) {
    const decoys = pool.filter(x => HAB_GROUP[x.hab!] !== HAB_GROUP[hab]).map(x => x.n)
    return build(grade, tier, level, 'science: habitats', [`Which animal lives ${HABITAT_TEXT[hab]}?`], `Which animal lives ${HABITAT_TEXT[hab]}?`, a.n, decoys, rng, 2, `hab|${hab}|${a.n}`)
  }
  const decoys = [...new Set(pool.filter(x => HAB_GROUP[x.hab!] !== HAB_GROUP[hab]).map(x => HABITAT_TEXT[x.hab!]))]
  return build(grade, tier, level, 'science: habitats', [`Where would you find ${an(a.n)} living?`], `Where would you find ${an(a.n)} living?`, HABITAT_TEXT[hab], decoys, rng, 2, `hab|${a.n}`)
}

function classifyQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  if (rng.bool(0.4)) {
    const inv = rng.bool()
    const answers = ANIMALS.filter(a => INVERTEBRATE.includes(a.cls) === inv)
    const decoys = ANIMALS.filter(a => INVERTEBRATE.includes(a.cls) !== inv).map(a => a.n)
    const a = rng.pick(answers)
    const word = inv ? 'an invertebrate' : 'a vertebrate'
    return build(grade, tier, 5, 'science: classification', [`Which of these is ${word}?`, inv ? '(An invertebrate has no backbone.)' : '(A vertebrate has a backbone.)'], `Which of these is ${word}?`, a.n, decoys, rng, 4, `classify|${word}|${a.n}`)
  }
  return classQ(grade, tier, 5, rng)
}

/** Animals: sounds and babies (K), homes and groups (1), classes and diets (2), adaptations (3), food chains and habitats (4), ecosystems, life cycles and classification (5). */
export const animals: Generator = {
  id: 'animals',
  name: 'Animals',
  area: 'thinking',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.5, 1: 1.5, 2: 1.2, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const level = pickLevel(grade, tier, rng)
    const facts = () => factRiddle('animals', 'science: animals', ANIMAL_FACTS, grade, tier, rng, level)
    switch (level) {
      case 0: return rng.bool(0.55) ? soundQ(grade, tier, rng) : babyQ(grade, tier, rng)
      case 1: return rng.bool(0.5) ? homeQ(grade, tier, rng) : groupQ(grade, tier, rng)
      case 2: return rng.weighted([() => classQ(grade, tier, 2, rng), () => dietQ(grade, tier, 2, rng), () => facts()], [1, 1, 1.2])()
      case 3: return rng.bool(0.8) ? facts() : classQ(grade, tier, 3, rng)
      case 4: return rng.bool(0.6) ? facts() : habitatQ(grade, tier, 4, rng)
      default: return rng.bool(0.6) ? facts() : classifyQ(grade, tier, rng)
    }
  },
}
