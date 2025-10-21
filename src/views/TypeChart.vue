<template>
  <div class="type-chart-container">
    <div class="row">
      <div class="col-12 mb-4">
        <h2 class="text-center mb-3">Type Effectiveness Chart</h2>
        <p class="text-center text-muted">
          Shows damage multipliers when attacking each type. 
          <span class="text-danger">Red (0.5×)</span> = Not very effective, 
          <span class="text-success">Green (2×)</span> = Super effective,
          <span class="text-secondary">Gray (0×)</span> = No effect
        </p>
      </div>

      <div class="col-12">
        <div class="table-responsive">
          <table class="table table-bordered type-chart-table">
            <thead>
              <tr>
                <th class="sticky-header corner-cell">Attacker ↓ / Defender →</th>
                <th v-for="type in typeList" :key="'def-' + type" class="defender-header">
                  <div class="type-badge" :style="{ backgroundColor: getTypeColor(type) }">
                    {{ type }}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="attackerType in typeList" :key="'row-' + attackerType">
                <th class="attacker-cell">
                  <div class="type-badge" :style="{ backgroundColor: getTypeColor(attackerType) }">
                    {{ attackerType }}
                  </div>
                </th>
                <td v-for="defenderType in typeList" :key="'cell-' + attackerType + '-' + defenderType"
                    :class="getEffectivenessClass(attackerType, defenderType)"
                    class="effectiveness-cell">
                  {{ getEffectiveness(attackerType, defenderType) }}×
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="col-12 mt-4">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">How to Read the Chart</h5>
            <ul>
              <li><strong>Rows</strong> represent attacking types (your move's type)</li>
              <li><strong>Columns</strong> represent defending types (opponent's creature type)</li>
              <li><strong>Values</strong> show the damage multiplier:
                <ul>
                  <li><span class="badge bg-secondary">0×</span> = Immune (no damage)</li>
                  <li><span class="badge bg-danger">0.5×</span> = Not very effective (half damage)</li>
                  <li><span class="badge bg-secondary">1×</span> = Normal damage</li>
                  <li><span class="badge bg-success">2×</span> = Super effective (double damage)</li>
                </ul>
              </li>
              <li>For dual-type creatures, multiply both type effectiveness values together</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const typeList = [
  'Slime', 'Flame', 'Water', 'Plant', 'Electric', 'Earth', 'Ice', 'Poison',
  'Dark', 'Psychic', 'Gravity', 'Alloy', 'Time', 'Luck', 'Light', 'Crystal',
  'Spirit', 'Mystic', 'Storm', 'Lunar', 'Wind', 'Decay'
]

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

const typeColors = {
  Slime: '#A5D6A7', Flame: '#EF5350', Water: '#42A5F5', Plant: '#43A047',
  Electric: '#FBC02D', Earth: '#D7B98E', Ice: '#A7E2EB', Poison: '#BCA9F5',
  Dark: '#616161', Psychic: '#E1A9B8', Gravity: '#7C6BAF', Alloy: '#C0C0C0',
  Time: '#0097A7', Luck: '#9AF59A', Light: '#EAD9A6', Crystal: '#AEE7EC',
  Spirit: '#E6B0E6', Mystic: '#8E7CC3', Storm: '#3F51B5', Lunar: '#757575',
  Wind: '#CFD8DC', Decay: '#4B622B'
}

function getTypeColor(type) {
  return typeColors[type] || '#CFD8DC'
}

function getEffectiveness(attackerType, defenderType) {
  const row = typeChart[attackerType]
  if (!row) return 1
  const idx = typeList.indexOf(defenderType)
  return idx >= 0 ? row[idx] : 1
}

function getEffectivenessClass(attackerType, defenderType) {
  const eff = getEffectiveness(attackerType, defenderType)
  if (eff === 0) return 'immune'
  if (eff === 0.5) return 'not-effective'
  if (eff === 2) return 'super-effective'
  return 'normal'
}
</script>

<style scoped>
.type-chart-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.type-chart-table {
  font-size: 0.85rem;
  margin-bottom: 0;
}

.type-chart-table th,
.type-chart-table td {
  text-align: center;
  vertical-align: middle;
  padding: 0.5rem 0.25rem;
  min-width: 50px;
}

.sticky-header {
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.corner-cell {
  position: sticky;
  left: 0;
  z-index: 11;
  background: #f8f9fa;
  font-size: 0.75rem;
  min-width: 120px;
}

.attacker-cell {
  position: sticky;
  left: 0;
  background: white;
  z-index: 9;
  box-shadow: 2px 0 4px rgba(0,0,0,0.05);
}

.defender-header {
  font-weight: 600;
  background: #f8f9fa;
  padding: 0.5rem 0.25rem;
}

.type-badge {
  display: inline-block;
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  font-size: 0.8rem;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  white-space: nowrap;
}

.effectiveness-cell {
  font-weight: 600;
  font-size: 0.9rem;
  transition: background-color 0.2s, transform 0.1s;
}

.effectiveness-cell:hover {
  transform: scale(1.05);
  box-shadow: 0 0 8px rgba(0,0,0,0.2);
  z-index: 5;
  position: relative;
}

.immune {
  background-color: #6c757d;
  color: white;
}

.not-effective {
  background-color: #ffebee;
  color: #c62828;
}

.super-effective {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.normal {
  background-color: #f5f5f5;
  color: #424242;
}

.table-responsive {
  max-height: 70vh;
  overflow: auto;
  border: 1px solid #dee2e6;
  border-radius: 8px;
}

.table-responsive::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.table-responsive::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 5px;
}

.table-responsive::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 5px;
}

.table-responsive::-webkit-scrollbar-thumb:hover {
  background: #555;
}

@media (max-width: 768px) {
  .type-chart-table {
    font-size: 0.75rem;
  }
  
  .type-badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.4rem;
  }
  
  .type-chart-table th,
  .type-chart-table td {
    min-width: 40px;
    padding: 0.35rem 0.15rem;
  }
  
  .corner-cell {
    min-width: 90px;
    font-size: 0.65rem;
  }
}
</style>
