<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import CreatureCard from './CreatureCard.vue'
import Moveset from './Moveset.vue'
import DamagePreview from './DamagePreview.vue'

const props = defineProps({ msg: { type: String, default: 'Damage Calculator' } })

const types = [
  '--', 'Slime', 'Flame', 'Water', 'Plant', 'Electric', 'Earth', 'Ice', 'Poison',
  'Dark', 'Psychic', 'Gravity', 'Alloy', 'Time', 'Luck', 'Light', 'Crystal',
  'Spirit', 'Mystic', 'Storm', 'Lunar', 'Wind', 'Decay'
]

const categories = ['Physical', 'Special', 'Status']

// Shared panel width for moveset and creature cards (adjust to taste)
const panelWidth = '630px'

// selected move indices for each creature's moveset (default to 0)
const selectedMove = reactive({ a: 0, b: 0 })

function emptyStatRow() {
  return {
    base: 100,
    iv: 31,
    ev: 0,
    total: '--',
    boost: 0,
    boostedTotal: '--'
  }
}

function emptyMove() {
  return { name: '', power: 0, accuracy: 100, type: '--', category: 'Special', info: '', accInfo: '' }
}

const creatures = reactive([
  {
    id: 'creature1',
    name: 'Creature 1',
    level: 100,
    nature: '--',
    type1: 'Flame',
    type2: '--',
    stats: [
      emptyStatRow(), // HP
      emptyStatRow(), // Attack
      emptyStatRow(), // Defense
      emptyStatRow(), // Sp. Atk
      emptyStatRow(), // Sp. Def
      emptyStatRow(), // Speed
      emptyStatRow(), // Res
      emptyStatRow()  // Luck
    ],
    currentHp: 100,
    hpPercent: 100,
    moves: [emptyMove(), emptyMove(), emptyMove(), emptyMove()]
  },
  {
    id: 'creature2',
    name: 'Creature 2',
    level: 100,
    nature: '--',
    type1: 'Water',
    type2: '--',
    stats: [
      emptyStatRow(), emptyStatRow(), emptyStatRow(), emptyStatRow(),
      emptyStatRow(), emptyStatRow(), emptyStatRow(), emptyStatRow()
    ],
    currentHp: 100,
    hpPercent: 100,
    moves: [emptyMove(), emptyMove(), emptyMove(), emptyMove()]
  }
])

// Helper: compute totals using same formulas from the sample
// Notes on formulas and conventions used here:
// - Stats array ordering: [HP, Attack, Defense, Sp. Atk, Sp. Def, Speed, Res, Luck]
// - HP formula: floor(((2 * base + iv + floor(ev/4)) * level) / 100) + level + 10
//   This mirrors common RPG/Pokemon-like HP scaling where HP scales with level,
//   base, IV and EV contributions.
// - Non-HP stats formula: floor(((2 * base + iv + floor(ev/4)) * level) / 100 + 5)
//   Then multiplied by the nature modifier (see natureMultiplier).
// - Nature: stored as "upIndex,downIndex" (e.g. "2,1") where upIndex increases stat
//   by +10% and downIndex decreases it by -10% (natureMultiplier = 0.1). Indexes map
//   to the stat ordering described above. If nature is '--' nothing is changed.
// - Boosts: temporary battle boosts (row.boost) are applied as a simple step of 0.25 per
//   boost level when computing boostedTotal (e.g. +1 -> *1.25).
function calculateStatsFor(creature) {
  const level = Number(creature.level) || 100
  const evNeeded = 4
  const natureMultiplier = 0.1

  // default modifiers
  const modifiers = Array(creature.stats.length).fill(1)
  if (creature.nature !== '--') {
    const [upIndex, downIndex] = creature.nature.split(',').map(Number)
    if (!Number.isNaN(upIndex)) modifiers[upIndex] = 1 + natureMultiplier
    if (!Number.isNaN(downIndex)) modifiers[downIndex] = 1 - natureMultiplier
  }

  let totalEV = 0
  creature.stats.forEach((row, idx) => {
    const base = Number(row.base) || 100
    const iv = Number(row.iv) || 31
    const ev = Number(row.ev) || 0
    totalEV += ev

    let total
    if (idx === 0) {
      // HP
      total = Math.floor(((2 * base + iv + Math.floor(ev / evNeeded)) * level) / 100) + level + 10
      row.total = total
    } else {
      total = Math.floor(((2 * base + iv + Math.floor(ev / evNeeded)) * level) / 100 + 5)
      total = Math.floor(total * modifiers[idx])
      row.total = total
    }

    // boosted
    const step = 0.10
    const boosts = Number(row.boost) || 0
    if (row.total > 0 && boosts !== 0) row.boostedTotal = Math.floor(row.total * (1 + (boosts * step)))
    else row.boostedTotal = row.total
  })

  // cap EV display (same cell in sample)
  creature.evTotal = totalEV
}

function updateHPFor(creature) {
  // Keep currentHp and hpPercent in sync.
  // currentHp is clamped between 0 and max HP. hpPercent is the rounded integer percent.
  const max = Number(creature.stats[0].total) || 1
  let current = Number(creature.currentHp) || 0
  if (current > max) { current = max; creature.currentHp = max }
  const percent = Math.min(100, Math.max(0, Math.round((current / Math.max(1, max)) * 100)))
  creature.hpPercent = percent
}

function updateMovesetDisplay() {
  // For each creature, compute move info based on opposing creature
  // Damage calculation notes:
  // - We compute a simplified "damage" as floor((power * attackerStat) / defenderStat).
  // - Then convert that damage into a percent of the defender's max HP to show the min/max
  //   percent ranges. The sample applied a 0.9-1.0 multiplier band to show variance.
  // - Luck effect is a small derived percentage based on log2(attackerLuck/defenderLuck).
  // - Type effectiveness (multiplier based on move.type vs defender.type1/type2) is applied
  //   below by multiplying rawDamage by eff (eff can be 0.5, 2, etc.). The chart is duplicated
  //   here for convenience; consider extracting it to a shared util for consistency.
  creatures.forEach((creature, i) => {
    const opponent = creatures[i === 0 ? 1 : 0]
    creature.moves.forEach((move, index) => {
      const moveName = move.name || 'Unknown'
      const movePower = Number(move.power) || 0
      const moveAccuracy = Number(move.accuracy) || 0
      const category = move.category || 'Special'

      let attackerStatIndex = 3 // Sp. Atk
      let defenderStatIndex = 4 // Sp. Def
      if (category === 'Physical') { attackerStatIndex = 1; defenderStatIndex = 2 }

      const attackerStat = Number(creature.stats[attackerStatIndex].total) || 1
      const attackerLuck = Number(creature.stats[7].total) || 1
      const defenderStat = Number(opponent.stats[defenderStatIndex].total) || 1
      const defenderHP = Number(opponent.stats[0].total) || 1
      const defenderLuck = Number(opponent.stats[7].total) || 1

      // type effectiveness lookup (attacker type -> defender types)
      const typeList = ['Slime','Flame','Water','Plant','Electric','Earth','Ice','Poison','Dark','Psychic','Gravity','Alloy','Time','Luck','Light','Crystal','Spirit','Mystic','Storm','Lunar','Wind','Decay']
      const typeChart = {
        Slime:   [2,0.5,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,2],
        Flame:   [0,1,0.5,2,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1],
        Water:   [0,2,1,0.5,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1],
        Plant:   [0.5,0.5,2,1,1,2,2,0.5,1,1,1,1,1,1,2,1,1,2,1,1,2,2],
        Electric:[0.5,1,2,1,1,0,2,1,1,1,2,2,1,1,1,1,1,1,1,1,2,1],
        Earth:   [0.5,1,1,0.5,2,1,1,1,1,1,2,0.5,1,1,1,1,1,1,1,1,1,1],
        Ice:     [2,0.5,0.5,2,1,2,1,1,1,1,1,0.5,1,1,1,2,1,1,1,1,1,1],
        Poison:  [0.5,1,1,2,1,0.5,1,1,1,1,1,0,1,1,1,0.5,2,1,1,1,1,2],
        Dark:    [1,1,1,1,1,1,1,1,1,2,1,1,1,1,0.5,1,1,2,1,2,1,1],
        Psychic: [1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,0.5,1,1,1,1,1],
        Gravity: [1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        Alloy:   [1,1,1,1,0.5,2,2,1,1,1,0.5,1,1,1,1,1,1,1,1,1,1,1],
        Time:    [1,2,1,0.5,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1],
        Luck:    [1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1],
        Light:   [1,1,1,1,1,1,1,2,2,0.5,1,1,1,1,1,1,1,1,1,1,1,1],
        Crystal: [1,2,1,1,2,1,0.5,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1],
        Spirit:  [2,1,1,1,1,1,1,0.5,2,2,1,1,1,1,1,1,1,1,1,1,1,1],
        Mystic:  [2,1,1,2,1,1,1,1,0.5,1,1,1,1,1,1,1,1,1,1,1,1,1],
        Storm:   [1,1,2,1,0.5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1],
        Lunar:   [1,1,1,1,1,1,1,1,0.5,1,1,1,1,1,1,1,1,1,1,1,1,1],
        Wind:    [0.5,2,0.5,2,0.5,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1],
        Decay:   [2,1,1,0.5,1,1,0.5,0.5,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      }

      function getEffectiveness(attackerType, defenderTypeA, defenderTypeB) {
        if (!attackerType || attackerType === '--') return 1
        const row = typeChart[attackerType]
        if (!row) return 1
        const idxA = typeList.indexOf(defenderTypeA)
        const idxB = typeList.indexOf(defenderTypeB)
        const mA = idxA >= 0 ? row[idxA] : 1
        const mB = idxB >= 0 ? row[idxB] : 1
        return mA * mB
      }

      const rawDamage = Math.floor((movePower * attackerStat) / Math.max(1, defenderStat))
      const eff = getEffectiveness(move.type, opponent.type1, opponent.type2)
      const damage = Math.floor(rawDamage * eff)
      const minPercent = Math.max(1, Math.floor((damage * 0.9 / defenderHP) * 100))
      const maxPercent = Math.max(minPercent, Math.floor((damage * 1.0 / defenderHP) * 100))

      const luckRatio = attackerLuck / Math.max(defenderLuck, 1)
      const clampedRatio = Math.max(0.5, Math.min(2, luckRatio))
      const luckEffect = (Math.log2(clampedRatio) * 15)

      move.info = `${minPercent}% - ${maxPercent}%`
      move.accInfo = `acc: ${moveAccuracy}, luck: ${luckEffect > 0 ? '+' : ''}${luckEffect.toFixed(2)}%`
    })
  })
}

function calculateAll() {
  creatures.forEach(calculateStatsFor)
  creatures.forEach(updateHPFor)
  updateMovesetDisplay()
}

function onCurrentHpInput(creature) {
  updateHPFor(creature)
}

function onHpPercentInput(creature) {
  // percent -> currentHp
  const max = Number(creature.stats[0].total) || 1
  let pct = Number(creature.hpPercent) || 0
  pct = Math.min(100, Math.max(0, Math.round(pct)))
  creature.currentHp = Math.round((pct / 100) * max)
  updateHPFor(creature)
}

// watch for changes and recalc
watch(creatures, () => calculateAll(), { deep: true })

onMounted(() => {
  // initialize totals
  calculateAll()
})
</script>

<template>
  <div class="container py-4 component-root">
    <h1 class="text-center text-primary display-4 mb-3">{{ props.msg }}</h1>

  <div class="d-flex justify-content-center gap-3 moveset-container mb-3">
  <Moveset @select-move="(idx) => { selectedMove.a = idx }" :creature="creatures[0]" :opponent="creatures[1]" :index="1" :panelWidth="panelWidth" />
  <Moveset @select-move="(idx) => { selectedMove.b = idx }" :creature="creatures[1]" :opponent="creatures[0]" :index="2" :panelWidth="panelWidth" />
  </div>

  <div class="d-flex justify-content-center gap-3 mb-3">
    <DamagePreview :attacker="creatures[0]" :defender="creatures[1]" :moveIndex="selectedMove.a" />
    <DamagePreview :attacker="creatures[1]" :defender="creatures[0]" :moveIndex="selectedMove.b" />
  </div>

    <div class="d-flex justify-content-center gap-3 editor-container flex-nowrap">
      <CreatureCard v-for="(creature, ci) in creatures" :key="creature.id"
        :creature="creature" :types="types" :categories="categories"
        :onCurrentHpInput="onCurrentHpInput" :onHpPercentInput="onHpPercentInput" :onStatsChange="calculateAll" :panelWidth="panelWidth" />
    </div>
  </div>
</template>

<style scoped>
.component-root { font-size:14px }
.moveset-container { gap: 10px; }
.moveset1, .moveset2 { box-shadow: 0 0 10px rgba(0,0,0,0.1); }
.options { background-color: #f2f2f2; border: 2px solid #818181; border-radius:10px; padding:6px; width:170px }
.option label { display:block; padding:5px 8px; cursor:pointer; border-bottom:1px solid #ccc }
.stat-table input { max-width: 90px }
.hp-bar { width:100%; }
.move-row input, .move-row select { margin-right:6px }
</style>
