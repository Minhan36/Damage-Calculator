<script setup>
import { computed, ref, onBeforeUnmount, onMounted } from 'vue'

const props = defineProps({
    creature: { type: Object, required: true },
    types: { type: Array, required: true },
    categories: { type: Array, required: true },
    onCurrentHpInput: Function,
    onHpPercentInput: Function,
    onStatsChange: Function,
    panelWidth: { type: String, default: '620px' }
})

// Loadout dropdown state
const STORAGE_KEY = 'genomix_loadouts_v1'
const showDropdown = ref(false)
const searchQuery = ref('')
const savedLoadouts = ref([])
const dropdownRef = ref(null)

function loadSavedLoadouts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    savedLoadouts.value = raw ? JSON.parse(raw) : []
  } catch (e) {
    savedLoadouts.value = []
  }
}

const filteredLoadouts = computed(() => {
  if (!searchQuery.value) return savedLoadouts.value
  const q = searchQuery.value.toLowerCase()
  return savedLoadouts.value.filter(l => 
    (l.name || '').toLowerCase().includes(q) ||
    (l.type1 || '').toLowerCase().includes(q) ||
    (l.type2 || '').toLowerCase().includes(q)
  )
})

function selectLoadout(loadout) {
  if (!loadout) {
    showDropdown.value = false
    return
  }
  // Deep copy fields into current creature
  props.creature.name = loadout.name || props.creature.name
  props.creature.imageUrl = loadout.imageUrl || props.creature.imageUrl || ''
  props.creature.level = loadout.level || props.creature.level
  props.creature.nature = loadout.nature || props.creature.nature
  props.creature.type1 = loadout.type1 || props.creature.type1
  props.creature.type2 = loadout.type2 || props.creature.type2
  props.creature.currentHp = loadout.currentHp || props.creature.currentHp
  props.creature.hpPercent = loadout.hpPercent || props.creature.hpPercent
  if (Array.isArray(loadout.stats)) {
    props.creature.stats = loadout.stats.map(s => ({ ...s }))
  }
  if (Array.isArray(loadout.moves)) {
    props.creature.moves = loadout.moves.map(m => ({ ...m }))
  }
  // Notify parent to recalculate
  props.onStatsChange && props.onStatsChange(props.creature)
  showDropdown.value = false
  searchQuery.value = ''
}

function handleClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  loadSavedLoadouts()
  // Close dropdown when clicking outside
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Simple map for icons/colors for a few types. Falls back to a neutral style.
const typeStyles = {
    Slime: { color: '#A5D6A7' },   // light green
    Flame: { color: '#EF5350' },   // red-orange
    Water: { color: '#42A5F5' },   // medium blue
    Plant: { color: '#43A047' },   // rich green
    Electric: { color: '#FBC02D' },       // golden yellow
    Earth: { color: '#D7B98E' },   // tan / sand
    Ice: { color: '#A7E2EB' },   // pale cyan
    Poison: { color: '#BCA9F5' },   // lavender
    Dark: { color: '#616161' },   // gray-black
    Psychic: { color: '#E1A9B8' },   // dusty pink
    Gravity: { color: '#7C6BAF' },   // purple
    Alloy: { color: '#C0C0C0' },   // metallic silver
    Time: { color: '#0097A7' },   // teal cyan
    Luck: { color: '#9AF59A' },   // mint green
    Light: { color: '#EAD9A6' },   // pale gold
    Crystal: { color: '#AEE7EC' },   // light aqua
    Spirit: { color: '#E6B0E6' },   // soft pink-purple
    Mystic: { color: '#8E7CC3' },   // violet
    Storm: { color: '#3F51B5' },   // deep blue
    Lunar: { color: '#757575' },   // gray
    Wind: { color: '#CFD8DC' },   // pale gray-blue
    Decay: { color: '#4B622B' },   // moss green
    '--': { color: '#CFD8DC' }   // default fallback
};

function getTypeStyle(type) {
    return typeStyles[type] || { icon: 'fa-solid fa-circle-question', color: '#cfd8dc' }
}

function textColor(hex) {
    // simple luminance check — return black or white for contrast
    if (!hex || hex[0] !== '#') return '#000'
    const r = parseInt(hex.substr(1, 2), 16)
    const g = parseInt(hex.substr(3, 2), 16)
    const b = parseInt(hex.substr(5, 2), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? '#000' : '#fff'
}

// stat names must match the parent's stat ordering; index 0 is HP
const statNames = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed', 'Res', 'Luck']

// Short descriptions used as tooltips on the stat name column.
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

// Parse the current nature into up/down indices for UI highlighting
const natureIndices = computed(() => {
    const n = (props.creature && props.creature.nature) || '--'
    if (!n || n === '--') return { up: -1, down: -1 }
    const [u, d] = String(n).split(',').map(v => Number(v))
    return { up: Number.isNaN(u) ? -1 : u, down: Number.isNaN(d) ? -1 : d }
})

// dragging support for HP bar
const hpBarRef = ref(null)
let _onPointerMove = null
let _onPointerUp = null

function clamp(v, a = 0, b = 100) { return Math.min(b, Math.max(a, v)) }

function pointerToPercent(clientX) {
    const el = hpBarRef.value
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left
    const pct = Math.round((x / rect.width) * 100)
    return clamp(pct, 0, 100)
}

function startDrag(e) {
    e.preventDefault()
    const pct = pointerToPercent(e.clientX)
    props.creature.hpPercent = pct
    props.onHpPercentInput && props.onHpPercentInput(props.creature)

    _onPointerMove = (ev) => {
        const p = pointerToPercent(ev.clientX)
        props.creature.hpPercent = p
        props.onHpPercentInput && props.onHpPercentInput(props.creature)
    }

    _onPointerUp = () => {
        window.removeEventListener('pointermove', _onPointerMove)
        window.removeEventListener('pointerup', _onPointerUp)
        _onPointerMove = null
        _onPointerUp = null
    }

    window.addEventListener('pointermove', _onPointerMove)
    window.addEventListener('pointerup', _onPointerUp)
}

onBeforeUnmount(() => {
    if (_onPointerMove) window.removeEventListener('pointermove', _onPointerMove)
    if (_onPointerUp) window.removeEventListener('pointerup', _onPointerUp)
    if (typeof _statOnPointerMove !== 'undefined' && _statOnPointerMove) window.removeEventListener('pointermove', _statOnPointerMove)
    if (typeof _statOnPointerUp !== 'undefined' && _statOnPointerUp) window.removeEventListener('pointerup', _statOnPointerUp)
    document.removeEventListener('click', handleClickOutside)
})

// Helpers for stat bar graph (used in the UI to the right of the image)
// cap used for normalization of bar width
const BAR_CAP = 150
function barWidthPercent(base) {
    // cap at BAR_CAP for display; normalize to percentage of BAR_CAP
    const val = Number(base) || 0
    const capped = Math.min(Math.max(val, 0), BAR_CAP)
    return (capped / BAR_CAP * 100) + '%'
}

function getBarColor(base) {
    const val = Number(base) || 0
    if (val <= 60) return '#f44336' // red
    if (val <= 89) return '#ffcc00' // yellow
    return '#4caf50' // green
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
            // notify parent to recalculate totals if handler provided
            props.onStatsChange && props.onStatsChange(props.creature)
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
        // ensure parent recalculation once drag ends
        props.onStatsChange && props.onStatsChange(props.creature)
    }

    window.addEventListener('pointermove', _statOnPointerMove)
    window.addEventListener('pointerup', _statOnPointerUp)
}
</script>

<template>
    <div class="card p-3 creature-box" :style="{ minWidth: props.panelWidth, maxWidth: props.panelWidth }">
        <!-- Creature name dropdown -->
        <div ref="dropdownRef" class="creature-name-dropdown mb-4 position-relative">
            <div class="dropdown-trigger d-flex align-items-center justify-content-between p-2 border rounded bg-light" 
                 @click="showDropdown = !showDropdown" 
                 style="cursor: pointer;">
                <h2 class="mb-0">{{ props.creature.name }}</h2>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            
            <div v-if="showDropdown" class="dropdown-menu-custom position-absolute w-100 mt-1 border rounded bg-white shadow">
                <div class="p-2 border-bottom">
                    <input v-model="searchQuery" 
                           type="text" 
                           class="form-control" 
                           placeholder="Search loadouts..." 
                           @click.stop
                           autofocus />
                </div>
                <div class="dropdown-items-container">
                    <div class="dropdown-item-custom p-2 border-bottom" 
                         @click="selectLoadout(null)" 
                         style="cursor: pointer;">
                        <strong>Default (Keep Current)</strong>
                    </div>
                    <div v-for="loadout in filteredLoadouts" 
                         :key="loadout.id" 
                         class="dropdown-item-custom p-2 border-bottom" 
                         @click="selectLoadout(loadout)" 
                         style="cursor: pointer;">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>{{ loadout.name }}</strong>
                                <div class="small text-muted">
                                    Lv{{ loadout.level }} • {{ loadout.type1 }}{{ loadout.type2 && loadout.type2 !== '--' ? '/' + loadout.type2 : '' }}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-if="filteredLoadouts.length === 0 && searchQuery" class="p-3 text-center text-muted">
                        No loadouts found
                    </div>
                </div>
            </div>
        </div>

        <!-- Image + stat bars (image left, bars right) -->
        <div class="row mb-3 align-items-stretch g-2">
            <!-- Image column -->
            <div class="col-12 col-md-5 col-lg-4">
                <div class="creature-image-wrapper">
                    <img :src="props.creature.imageUrl || 'https://placehold.co/200x200.png'" 
                         alt="creature" 
                         class="creature-image rounded" />
                </div>
            </div>

            <!-- Stat bars column -->
            <div class="col-12 col-md-7 col-lg-8">
                <div class="stat-bars-wrapper">
                    <!-- Bar graph title -->
                    <h6 class="text-center mb-2 fw-bold stat-bars-title">Base Stats</h6>
                    <div v-for="(name, idx) in statNames" :key="name"
                        class="stat-bar-row d-flex align-items-center mb-1">
                        <div class="stat-bar-label me-1">
                            {{ name }}
                        </div>
                        <div class="stat-bar-track flex-grow-1" role="img"
                            :aria-label="name + ' value ' + (props.creature.stats[idx] && props.creature.stats[idx].base || 0)"
                            @pointerdown="startStatDrag($event, idx)">
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
        </div>



        <div class="mb-2">
            <div class="row g-2 align-items-center">
                <div class="col-5">
                    <label class="form-label mb-1">Type</label>
                    <!-- color the type selects' background based on selection -->
                    <div class=" d-flex gap-1">
                        <select v-model="props.creature.type1" class="form-select me-1"
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
                    <label class="form-label mb-1">Nature</label>
                    <!-- tooltip explains the nature mechanic: +10% to one stat, -10% to another -->
                    <select v-model="props.creature.nature" class="form-select"
                        title="Nature: applies a +10% buff to one stat and a -10% debuff to another."
                        aria-label="Nature (applies +10% to one stat and -10% to another)">
                        <option v-for="opt in natureOptions" :key="opt.value" :value="opt.value">{{ opt.label }}
                        </option>
                    </select>
                </div>
                <div class="col-3">
                    <label class="form-label mb-1">Level</label>
                    <input type="number" v-model.number="props.creature.level" min="1" max="100" class="form-control" />
                </div>
            </div>
        </div>

        <div class="mt-2">
            <label>Current HP:</label>
            <input type="number" v-model.number="props.creature.currentHp"
                @input="props.onCurrentHpInput && props.onCurrentHpInput(props.creature)" min="0"
                class="current-hp form-control d-inline-block"
                style="width:70px; height: 20px; font-size: small; margin-left: 4px;" />
            / <span class="max-hp-display">{{ props.creature.stats[0].total }}</span>
            (<span class="hp-percent d-inline-block" style="width:90px; text-align:center; display:inline-block">{{
                props.creature.hpPercent }}%</span>)
            <div class="hp-bar mt-2 bg-light" ref="hpBarRef" @pointerdown="startDrag"
                style="height:12px;border-radius:6px;overflow:hidden;cursor:pointer;">
                <div class="hp-bar-fill"
                    :style="{ width: (props.creature.hpPercent || 0) + '%', backgroundColor: props.creature.hpPercent > 50 ? '#4caf50' : props.creature.hpPercent > 25 ? '#ffcc00' : '#f44336', height: '100%' }">
                </div>
            </div>
        </div>

        <table class="table stat-table">
            <thead>
                <tr>
                    <th></th>
                    <th>Base</th>
                    <th>IV</th>
                    <th>EV</th>
                    <th>Total</th>
                    <th>Boost</th>
                    <th>Boosted</th>
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
                            <span>{{ ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed', 'Res', 'Luck'][ri]
                                }}</span>
                        </div>
                    </td>
                    <td><input type="number" v-model.number="row.base" min="0" class="form-control" /></td>
                    <td><input type="number" v-model.number="row.iv" min="0" class="form-control" /></td>
                    <td><input type="number" v-model.number="row.ev" min="0" class="form-control" /></td>
                    <td class="text-center align-middle">
                        <span
                            :class="{ 'nature-up': natureIndices.up === ri, 'nature-down': natureIndices.down === ri }">{{
                                row.total }}</span>
                    </td>
                    <td class="text-center align-middle" style="padding:0;width:80px">
                        <div v-if="ri > 0">
                            <!-- Boost tooltip: per-stage modifier (approx. 10% per stage by intent) -->
                            <select v-model.number="row.boost" class="form-select"
                                style="width:70px;display:inline-block"
                                title="Boost stages modify the in-battle stat. Each stage increases/decreases the stat by roughly 10% per stage (adjustable in code)."
                                aria-label="Boost stage (roughly +10% per stage)">
                                <option v-for="v in [
                                    16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
                                    0,
                                    -1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -14, -15, -16
                                ]" :value="v" :key="v">{{ v > 0 ? '+' + v : v
                                }}</option>
                            </select>
                        </div>
                        <div v-else class="text-muted">&mdash;</div>
                    </td>
                    <td class="boostedTotal text-center align-middle" style="width:50px; margin:auto">{{
                        row.boostedTotal }}</td>
                </tr>
                <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td class="ev-total">{{ props.creature.evTotal || 0 }}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            </tbody>
        </table>


        <!-- Moves -->
        <div class="moves mt-3">
            <h5>Moves:</h5>
            <div v-for="(move, mi) in props.creature.moves" :key="mi" class="d-flex align-items-center mb-2 move-row">
                <div class="me-2" style="width:140px">
                    <label class="form-label small mb-1">Name</label>
                    <input type="text" v-model="move.name" placeholder="Move name" class="form-control"
                        style="width:100%" title="Move name" />
                </div>

                <div class="me-2 text-center" style="width:90px">
                    <label class="form-label small mb-1">Pow</label>
                    <input type="number" v-model.number="move.power" class="form-control" style="width:100%"
                        title="Move power (damage)" />
                </div>

                <div class="me-2 text-center" style="width:90px">
                    <label class="form-label small mb-1">Acc</label>
                    <input type="number" v-model.number="move.accuracy" class="form-control" style="width:100%"
                        title="Move accuracy (percent)" />
                </div>

                <div class="me-2" style="width:120px">
                    <label class="form-label small mb-1">Type</label>
                    <select v-model="move.type" class="form-select"
                        :style="{ backgroundColor: getTypeStyle(move.type).color, color: textColor(getTypeStyle(move.type).color) }">
                        <option v-for="t in props.types" :key="t"
                            :style="{ backgroundColor: getTypeStyle(t).color, color: textColor(getTypeStyle(t).color) }">
                            {{ t }}</option>
                    </select>
                </div>

                <div style="width:120px">
                    <label class="form-label small mb-1">Category</label>
                    <select v-model="move.category" class="form-select">
                        <option v-for="c in props.categories" :key="c">{{ c }}</option>
                    </select>
                </div>
            </div>
        </div>

    </div>
</template>

<style scoped>
.creature-box {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.08)
}

.nature-up {
    background-color: #e6f9ea;
    padding: 2px 6px;
    border-radius: 4px
}

.nature-down {
    background-color: #fdecea;
    padding: 2px 6px;
    border-radius: 4px
}

.nature-up-col {
    background-color: rgba(230, 249, 234, 0.6)
}

.nature-down-col {
    background-color: rgba(253, 236, 234, 0.6)
}

.nature-symbol {
    font-size: 0.7rem;
    margin-right: 6px;
    opacity: 0.9
}

.nature-symbol.up {
    color: #2e7d32
}

.nature-symbol.down {
    color: #c62828
}

/* Stat table column sizing: wider first column (stat names), narrower Base/IV/EV columns */
.stat-table th:first-child,
.stat-table td:first-child {
    width: 100px;
    max-width: 180px;
}

.stat-table th:nth-child(2),
.stat-table td:nth-child(2),
.stat-table th:nth-child(3),
.stat-table td:nth-child(3),
.stat-table th:nth-child(4),
.stat-table td:nth-child(4) {
    width: 100px;
    max-width: 90px;
}

.stat-bars .stat-bar-row {
    align-items: center;
    margin-bottom: 4px;
    /* reduced vertical spacing */
    padding: 1px 0;
}

.stat-bar-track {
    background: #f1f3f5;
    height: 10px;
    border-radius: 6px;
    overflow: hidden;
    cursor: ew-resize;
}

.stat-bar-fill {
    height: 100%;
    transition: width 160ms ease, background-color 100ms linear;
    border-radius: 6px;
}

.stat-bar-label {
    color: #333;
    width: 55px;
    font-size: 0.75rem;
    font-weight: 500;
}

.stat-bar-value {
    color: #222;
    width: 32px;
    text-align: right;
    font-size: 0.75rem;
    font-weight: 600;
}

.stat-bars-title {
    font-size: 1rem;
}

.stat-bars-wrapper {
    padding: 0.5rem;
}

/* Creature image styling */
.creature-image-wrapper {
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 8px;
    border: 2px solid #e0e0e0;
    background: white;
}

.creature-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Responsive adjustments */
@media (max-width: 767px) {
    .creature-image-wrapper {
        max-width: 200px;
        margin: 0 auto;
    }
    
    .stat-bar-label {
        width: 45px;
        font-size: 0.7rem;
    }
    
    .stat-bar-value {
        width: 28px;
        font-size: 0.7rem;
    }
    
    .stat-bars-title {
        font-size: 0.9rem;
    }
}

@media (min-width: 768px) and (max-width: 991px) {
    .stat-bar-label {
        width: 50px;
    }
}

/* When panelWidth is 100%, make it extra responsive */
.creature-box[style*="100%"] .creature-image-wrapper {
    max-width: 180px;
}

.creature-box[style*="100%"] .stat-bar-label {
    width: 50px;
    font-size: 0.72rem;
}

.creature-box[style*="100%"] .stat-bar-value {
    width: 30px;
    font-size: 0.72rem;
}

.creature-box[style*="100%"] .stat-bars-title {
    font-size: 0.95rem;
    margin-bottom: 0.5rem !important;
}

.hp-bar {
    height: 10px !important;
    /* slightly smaller than before */
}

.hp-bar .hp-bar-fill {
    height: 100% !important;
}

/* Dropdown styles */
.dropdown-trigger:hover {
    background-color: #e9ecef !important;
}

.dropdown-menu-custom {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    max-height: 500px;
    display: flex;
    flex-direction: column;
}

.dropdown-items-container {
    overflow-y: auto;
    max-height: 400px;
    flex: 1;
}

.dropdown-items-container::-webkit-scrollbar {
    width: 8px;
}

.dropdown-items-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

.dropdown-items-container::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
}

.dropdown-items-container::-webkit-scrollbar-thumb:hover {
    background: #555;
}

.dropdown-item-custom:hover {
    background-color: #f8f9fa;
}

.dropdown-item-custom:active {
    background-color: #e9ecef;
}
</style>