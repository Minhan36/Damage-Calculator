<script setup>
import { computed } from 'vue'

const props = defineProps({
  attacker: { type: Object, required: true },
  defender: { type: Object, required: true },
  moveIndex: { type: Number, required: true }
})

const move = computed(() => props.attacker.moves[props.moveIndex] || { name: '', power: 0, accuracy: 0, category: 'Special' })

// Type effectiveness matrix (attacker row -> defender column)
// Notes:
// - typeList matches the order used in the matrix. The matrix values are multipliers
//   (e.g. 2 = super effective, 0.5 = not very effective, 0 = no effect).
// - When a defender has two types the multipliers are multiplied together. E.g. x2 and x2 => x4.
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
  // Return multiplier for attackerType vs defender type(s). Defaults to 1 for unknowns or '--'.
  if (!attackerType || attackerType === '--') return 1
  const row = typeChart[attackerType]
  if (!row) return 1
  const idxA = typeList.indexOf(defenderTypeA)
  const idxB = typeList.indexOf(defenderTypeB)
  const mA = idxA >= 0 ? row[idxA] : 1
  const mB = idxB >= 0 ? row[idxB] : 1
  return mA * mB
}

const preview = computed(() => {
  const mv = move.value
  const power = Number(mv.power) || 0
  const category = mv.category || 'Special'

  let atkIdx = 3; let defIdx = 4
  if (category === 'Physical') { atkIdx = 1; defIdx = 2 }

  const atk = Number(props.attacker.stats[atkIdx].total) || 1
  const def = Number(props.defender.stats[defIdx].total) || 1
  const defHp = Number(props.defender.stats[0].total) || 1

  // apply type effectiveness
  const moveType = mv.type || '--'
  const eff = getEffectiveness(moveType, props.defender.type1, props.defender.type2)
  const rawDamage = Math.floor((power * atk) / Math.max(1, def))
  const damage = Math.floor(rawDamage * eff)
  const minPercent = Math.max(1, Math.floor((damage * 0.9 / defHp) * 100))
  const maxPercent = Math.max(minPercent, Math.floor((damage * 1.0 / defHp) * 100))

  return {
    name: mv.name || 'Unknown',
    power,
    damage,
    multiplier: eff,
    minPercent,
    maxPercent,
    accuracy: mv.accuracy || 0
  }
})
</script>

<template>
    <div class="card p-2 text-center small d-flex flex-row justify-content-center align-items-center damage-preview">
    <div class="fw-bold">{{ preview.name }}</div>
    <div class="">{{ preview.damage }} dmg</div>
    <div class="text-muted">{{ preview.minPercent }}% - {{ preview.maxPercent }}% | acc: {{ preview.accuracy }}%</div>
  </div>
</template>

<style scoped>
.damage-preview { min-width: 320px; min-height: 40px; display: flex; gap: 10px}
.damage-preview .fw-bold { font-size: 0.9rem }
</style>
