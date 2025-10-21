<script setup>
import { computed, ref, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
    creature: { type: Object, required: true },
    types: { type: Array, required: true },
    categories: { type: Array, required: true },
    onStatsChange: Function
})

// Calculate stats whenever base, iv, ev, nature, or level changes
watch(
    () => [
        props.creature.stats.map(s => s.base),
        props.creature.stats.map(s => s.iv),
        props.creature.stats.map(s => s.ev),
        props.creature.nature,
        props.creature.level
    ],
    () => {
        calculateStats()
    },
    { deep: true }
)

function calculateStats() {
    const level = Number(props.creature.level) || 100
    const evNeeded = 4
    const natureMultiplier = 0.1

    // default modifiers
    const modifiers = Array(props.creature.stats.length).fill(1)
    if (props.creature.nature !== '--') {
        const [upIndex, downIndex] = props.creature.nature.split(',').map(Number)
        if (!Number.isNaN(upIndex)) modifiers[upIndex] = 1 + natureMultiplier
        if (!Number.isNaN(downIndex)) modifiers[downIndex] = 1 - natureMultiplier
    }

    let totalEV = 0
    props.creature.stats.forEach((row, idx) => {
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

    // cap EV display
    props.creature.evTotal = totalEV
    
    // Notify parent if needed
    props.onStatsChange && props.onStatsChange(props.creature)
}

// Simple map for icons/colors for a few types
const typeStyles = {
    Slime: { color: '#A5D6A7' },
    Flame: { color: '#EF5350' },
    Water: { color: '#42A5F5' },
    Plant: { color: '#43A047' },
    Electric: { color: '#FBC02D' },
    Earth: { color: '#D7B98E' },
    Ice: { color: '#A7E2EB' },
    Poison: { color: '#BCA9F5' },
    Dark: { color: '#616161' },
    Psychic: { color: '#E1A9B8' },
    Gravity: { color: '#7C6BAF' },
    Alloy: { color: '#C0C0C0' },
    Time: { color: '#0097A7' },
    Luck: { color: '#9AF59A' },
    Light: { color: '#EAD9A6' },
    Crystal: { color: '#AEE7EC' },
    Spirit: { color: '#E6B0E6' },
    Mystic: { color: '#8E7CC3' },
    Storm: { color: '#3F51B5' },
    Lunar: { color: '#757575' },
    Wind: { color: '#CFD8DC' },
    Decay: { color: '#4B622B' },
    '--': { color: '#CFD8DC' }
}

function getTypeStyle(type) {
    return typeStyles[type] || { color: '#cfd8dc' }
}

function textColor(hex) {
    if (!hex || hex[0] !== '#') return '#000'
    const r = parseInt(hex.substr(1, 2), 16)
    const g = parseInt(hex.substr(3, 2), 16)
    const b = parseInt(hex.substr(5, 2), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? '#000' : '#fff'
}

const statNames = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed', 'Res', 'Luck']

const statDescriptions = {
    0: 'Hit Points — total health pool for the creature.',
    1: 'Attack — physical attack strength used for Physical moves.',
    2: 'Defense — reduces physical damage taken.',
    3: 'Sp. Atk — special attack strength used for Special moves.',
    4: 'Sp. Def — reduces special damage taken.',
    5: 'Speed — determines move order in battle.',
    6: 'Res — resistance stat used by some mechanics.',
    7: 'Luck — affects criticals and luck-based modifiers.'
}

function statTooltip(idx) {
    const name = statNames[idx] || 'Stat'
    const desc = statDescriptions[idx] || ''
    return `${name}${desc ? ': ' + desc : ''}`
}

const natureOptions = computed(() => {
    const opts = [{ value: '--', label: 'Neutral' }]
    for (let up = 1; up < statNames.length; up++) {
        for (let down = 1; down < statNames.length; down++) {
            if (up === down) continue
            opts.push({ value: `${up},${down}`, label: `+${statNames[up]}, -${statNames[down]}` })
        }
    }
    return opts
})

const natureIndices = computed(() => {
    const n = (props.creature && props.creature.nature) || '--'
    if (!n || n === '--') return { up: -1, down: -1 }
    const [u, d] = String(n).split(',').map(v => Number(v))
    return { up: Number.isNaN(u) ? -1 : u, down: Number.isNaN(d) ? -1 : d }
})

// Helpers for stat bar graph
const BAR_CAP = 150
function barWidthPercent(base) {
    const val = Number(base) || 0
    const capped = Math.min(Math.max(val, 0), BAR_CAP)
    return (capped / BAR_CAP * 100) + '%'
}

function getBarColor(base) {
    const val = Number(base) || 0
    if (val <= 60) return '#f44336'
    if (val <= 89) return '#ffcc00'
    return '#4caf50'
}

// Dragging helpers for stat bars (updates the corresponding base value)
let _statOnPointerMove = null
let _statOnPointerUp = null
function startStatDrag(e, idx) {
    e.preventDefault()
    const track = e.currentTarget

    function clientXToPct(clientX) {
        const rect = track.getBoundingClientRect()
        const x = clientX - rect.left
        const pct = Math.round((x / rect.width) * 100)
        return Math.min(100, Math.max(0, pct))
    }

    function setValueByPct(pct) {
        const val = Math.round((pct / 100) * BAR_CAP)
        if (props.creature && props.creature.stats && props.creature.stats[idx]) {
            props.creature.stats[idx].base = val
            calculateStats()
        }
    }

    // set initial position
    setValueByPct(clientXToPct(e.clientX))

    _statOnPointerMove = (ev) => {
        const p = clientXToPct(ev.clientX)
        setValueByPct(p)
    }

    _statOnPointerUp = () => {
        window.removeEventListener('pointermove', _statOnPointerMove)
        window.removeEventListener('pointerup', _statOnPointerUp)
        _statOnPointerMove = null
        _statOnPointerUp = null
        calculateStats()
    }

    window.addEventListener('pointermove', _statOnPointerMove)
    window.addEventListener('pointerup', _statOnPointerUp)
}

onBeforeUnmount(() => {
    if (typeof _statOnPointerMove !== 'undefined' && _statOnPointerMove) window.removeEventListener('pointermove', _statOnPointerMove)
    if (typeof _statOnPointerUp !== 'undefined' && _statOnPointerUp) window.removeEventListener('pointerup', _statOnPointerUp)
})
</script>

<template>
    <div class="loadout-form">
        <!-- Image + stat bars -->
        <div class="row mb-3 align-items-stretch g-3">
                <div class="stat-bars-wrapper">
                    <h6 class="text-center mb-2 fw-bold stat-bars-title">Base Stats</h6>
                    <div v-for="(name, idx) in statNames" :key="name"
                        class="stat-bar-row d-flex align-items-center mb-1">
                        <div class="stat-bar-label me-1">{{ name }}</div>
                        <div class="stat-bar-track flex-grow-1" @pointerdown="startStatDrag($event, idx)">
                            <div class="stat-bar-fill" :style="{
                                width: barWidthPercent(props.creature.stats[idx] && props.creature.stats[idx].base),
                                backgroundColor: getBarColor(props.creature.stats[idx] && props.creature.stats[idx].base)
                            }"></div>
                        </div>
                        <div class="stat-bar-value ms-1">
                            {{ props.creature.stats[idx] && props.creature.stats[idx].base || 0 }}
                        </div>
                    </div>
                </div>
            
        </div>

        <!-- Type, Nature, Level -->
        <div class="mb-3">
            <div class="row g-2 align-items-center">
                <div class="col-5">
                    <label class="form-label mb-1 fw-bold">Type</label>
                    <div class="d-flex gap-1">
                        <select v-model="props.creature.type1" class="form-select"
                            :style="{ backgroundColor: getTypeStyle(props.creature.type1).color, color: textColor(getTypeStyle(props.creature.type1).color) }">
                            <option v-for="t in props.types" :key="t"
                                :style="{ backgroundColor: getTypeStyle(t).color, color: textColor(getTypeStyle(t).color) }">
                                {{ t }}</option>
                        </select>
                        <select v-model="props.creature.type2" class="form-select"
                            :style="{ backgroundColor: getTypeStyle(props.creature.type2).color, color: textColor(getTypeStyle(props.creature.type2).color) }">
                            <option v-for="t in props.types" :key="t + '2'"
                                :style="{ backgroundColor: getTypeStyle(t).color, color: textColor(getTypeStyle(t).color) }">
                                {{ t }}</option>
                        </select>
                    </div>
                </div>
                <div class="col-4">
                    <label class="form-label mb-1 fw-bold">Nature</label>
                    <select v-model="props.creature.nature" class="form-select"
                        title="Nature: applies a +10% buff to one stat and a -10% debuff to another.">
                        <option v-for="opt in natureOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                </div>
                <div class="col-3">
                    <label class="form-label mb-1 fw-bold">Level</label>
                    <input type="number" v-model.number="props.creature.level" min="1" max="100" class="form-control" />
                </div>
            </div>
        </div>

        <!-- Stats Table (without HP bar, Boost, and Boosted columns) -->
        <table class="table table-sm stat-table">
            <thead>
                <tr>
                    <th></th>
                    <th>Base</th>
                    <th>IV</th>
                    <th>EV</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(row, ri) in props.creature.stats" :key="ri">
                    <td class="text-center align-middle"
                        :class="{ 'nature-up-col': natureIndices.up === ri, 'nature-down-col': natureIndices.down === ri }"
                        :title="statTooltip(ri)">
                        <div class="d-flex align-items-center justify-content-center">
                            <span v-if="natureIndices.up === ri" class="nature-symbol up">▲</span>
                            <span v-else-if="natureIndices.down === ri" class="nature-symbol down">▼</span>
                            <span>{{ statNames[ri] }}</span>
                        </div>
                    </td>
                    <td><input type="number" v-model.number="row.base" min="0" class="form-control form-control-sm" /></td>
                    <td><input type="number" v-model.number="row.iv" min="0" class="form-control form-control-sm" /></td>
                    <td><input type="number" v-model.number="row.ev" min="0" class="form-control form-control-sm" /></td>
                    <td class="text-center align-middle">
                        <span :class="{ 'nature-up': natureIndices.up === ri, 'nature-down': natureIndices.down === ri }">
                            {{ row.total }}
                        </span>
                    </td>
                </tr>
                <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td class="ev-total">{{ props.creature.evTotal || 0 }}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <!-- Moves (4 moves) -->
        <div class="moves mt-3">
            <h6 class="fw-bold mb-2">Moves</h6>
            <div v-for="(move, mi) in props.creature.moves" :key="mi" class="move-row mb-2">
                <div class="row g-2">
                    <div class="col-12 col-sm-6 col-md-3">
                        <label class="form-label small mb-1">Name</label>
                        <input type="text" v-model="move.name" placeholder="Move name" class="form-control form-control-sm" />
                    </div>
                    <div class="col-6 col-sm-3 col-md-2">
                        <label class="form-label small mb-1">Power</label>
                        <input type="number" v-model.number="move.power" class="form-control form-control-sm" />
                    </div>
                    <div class="col-6 col-sm-3 col-md-2">
                        <label class="form-label small mb-1">Accuracy</label>
                        <input type="number" v-model.number="move.accuracy" class="form-control form-control-sm" />
                    </div>
                    <div class="col-6 col-sm-6 col-md-2">
                        <label class="form-label small mb-1">Type</label>
                        <select v-model="move.type" class="form-select form-select-sm"
                            :style="{ backgroundColor: getTypeStyle(move.type).color, color: textColor(getTypeStyle(move.type).color) }">
                            <option v-for="t in props.types" :key="t"
                                :style="{ backgroundColor: getTypeStyle(t).color, color: textColor(getTypeStyle(t).color) }">
                                {{ t }}</option>
                        </select>
                    </div>
                    <div class="col-6 col-sm-6 col-md-3">
                        <label class="form-label small mb-1">Category</label>
                        <select v-model="move.category" class="form-select form-select-sm">
                            <option v-for="c in props.categories" :key="c">{{ c }}</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.loadout-form {
    font-size: 0.9rem;
}

.nature-up {
    background-color: #e6f9ea;
    padding: 2px 6px;
    border-radius: 4px;
}

.nature-down {
    background-color: #fdecea;
    padding: 2px 6px;
    border-radius: 4px;
}

.nature-up-col {
    background-color: rgba(230, 249, 234, 0.6);
}

.nature-down-col {
    background-color: rgba(253, 236, 234, 0.6);
}

.nature-symbol {
    font-size: 0.7rem;
    margin-right: 6px;
    opacity: 0.9;
}

.nature-symbol.up {
    color: #2e7d32;
}

.nature-symbol.down {
    color: #c62828;
}

.stat-table {
    margin-bottom: 0;
}

.stat-table th:first-child,
.stat-table td:first-child {
    width: 100px;
}

.stat-table th:nth-child(2),
.stat-table td:nth-child(2),
.stat-table th:nth-child(3),
.stat-table td:nth-child(3),
.stat-table th:nth-child(4),
.stat-table td:nth-child(4) {
    width: 90px;
}

.stat-table input {
    font-size: 0.85rem;
}

.stat-bar-row {
    align-items: center;
    margin-bottom: 4px;
    padding: 1px 0;
}

.stat-bar-track {
    background: #f1f3f5;
    height: 10px;
    border-radius: 6px;
    overflow: hidden;
}

.stat-bar-fill {
    height: 100%;
    transition: width 160ms ease, background-color 100ms linear;
    border-radius: 6px;
}

.stat-bar-label {
    color: #333;
    width: 50px;
    font-size: 0.72rem;
    font-weight: 500;
}

.stat-bar-value {
    color: #222;
    width: 30px;
    text-align: right;
    font-size: 0.72rem;
    font-weight: 600;
}

.stat-bars-title {
    font-size: 0.95rem;
}

.stat-bars-wrapper {
    padding: 0.5rem;
}

.creature-image-wrapper {
    width: 100%;
    max-width: 180px;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 8px;
    border: 2px solid #e0e0e0;
    background: white;
    margin: 0 auto;
}

.creature-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.move-row {
    padding: 0.5rem;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
}

@media (max-width: 767px) {
    .creature-image-wrapper {
        max-width: 150px;
    }
    
    .stat-bar-label {
        width: 45px;
        font-size: 0.68rem;
    }
    
    .stat-bar-value {
        width: 28px;
        font-size: 0.68rem;
    }
}
</style>
