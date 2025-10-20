<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
    creature: { type: Object, required: true },
    opponent: { type: Object, required: true },
    index: { type: Number, required: true },
    panelWidth: { type: String, default: '620px' }
})

const emit = defineEmits(['select-move'])

const moves = computed(() => props.creature.moves)
const selected = ref(0)

function select(idx) {
    selected.value = idx
    emit('select-move', idx)
}

// Local type color map (kept in-sync with CreatureCard's palette)
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
    '--': { color: '#f2f2f2' }
}

function getTypeStyle(t) {
    return typeStyles[t] || { color: '#f2f2f2' }
}

function textColor(hex) {
    if (!hex || hex[0] !== '#') return '#000'
    const r = parseInt(hex.substr(1, 2), 16)
    const g = parseInt(hex.substr(3, 2), 16)
    const b = parseInt(hex.substr(5, 2), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? '#000' : '#fff'
}

// Compute display info on demand (kept simple; heavy calculations live in parent)
</script>

<template>
    <div class="card p-3 d-flex flex-row align-items-start gap-1" :class="`moveset${props.index}`"
        :style="{ minWidth: props.panelWidth }">
        <!-- Options column -->
        <div class="options d-flex flex-column justify-content-between">
            <div v-for="(m, idx) in moves" :key="idx" class="option d-flex align-items-center"
                style="line-height: 1.2;">
                <input type="radio" :name="`move${props.index}`" :id="`c${props.index}-move-${idx}`" :checked="selected === idx"
                    style="display:none" />
                <label :for="`c${props.index}-move-${idx}`" class="fw-bold mb-0" style="cursor:pointer; width:100%"
                    @click.prevent="select(idx)" :class="{ 'selected': selected === idx }"
                    :style="{ backgroundColor: getTypeStyle(m.type).color, color: textColor(getTypeStyle(m.type).color) }">
                    {{ m.name || 'Move ' + (idx + 1) }}
                </label>
            </div>
        </div>

        <!-- Info column -->
        <div class="info flex-grow-1 d-flex flex-column justify-content-between px-2 py-1">
            <p v-for="(m, idx) in moves" :key="idx" class="mb-0 py-1 border-bottom">
                {{ m.info || '0 - 0%' }}
            </p>
        </div>

        <!-- Accuracy column -->
        <div class="accuracy text-end d-flex flex-column justify-content-between px-2 py-1">
            <p v-for="(m, idx) in moves" :key="idx" class="mb-0 py-1 border-bottom">
                {{ m.accInfo || '' }}
            </p>
        </div>

    </div>

</template>

<style scoped>
.options {
    background-color: #f2f2f2;
    border: 2px solid #818181;
    border-radius: 10px;
    padding: 6px;
    width: 170px;
    display: flex;
    flex-direction: column;
}

.option {
    width: 100%;
}

.option label {
    display: block;
    width: 100%;
    /* ensures underline spans entire width */
    padding: 5px 8px;
    cursor: pointer;
    border-bottom: 1px solid #ccc;
    margin: 0;
    /* removes extra vertical space */
    line-height: 1.3;
}

.option:last-child label {
    border-bottom: none;
}

.option label.selected {
    background-color: #e9f5ff;
}
</style>