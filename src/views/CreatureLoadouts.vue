<template>
  <div class="loadouts-container">
    <div class="row">
      <div class="col-12 mb-3 d-flex justify-content-between align-items-center">
        <h3 class="mb-0">
          Saved Loadouts
          <span class="badge bg-secondary ms-2">{{ loadouts.length }}</span>
          <span class="badge bg-info ms-2" :title="`Storage usage: ${storageSize}`">{{ storageSize }}</span>
        </h3>
        <div class="d-flex gap-2">
          <button class="btn btn-primary" @click="openCreate"><i class="bi bi-plus-lg me-1"></i>+ Create</button>
          <button class="btn btn-success" @click="loadSampleLoadouts" title="Load sample loadouts"><i class="bi bi-box-arrow-in-down me-1"></i>Load Sample</button>
          <button class="btn btn-outline-secondary" @click="exportLoadouts"><i class="bi bi-download me-1"></i>Export</button>
          <button class="btn btn-outline-secondary" @click="$refs.fileInput.click()"><i class="bi bi-upload me-1"></i>Import</button>
          <button v-if="loadouts.length > 0" class="btn btn-outline-danger" @click="deleteAllLoadouts" title="Delete all loadouts">
            <i class="bi bi-trash me-1"></i>Delete All
          </button>
          <input ref="fileInput" type="file" accept="application/json" class="d-none" @change="handleImport" />
        </div>
      </div>

      <div class="col-12">
        <div v-if="loadouts.length === 0" class="empty-state text-center py-5">
          <i class="bi bi-inbox" style="font-size: 3rem; color: #ccc;"></i>
          <p class="text-muted mt-3">No saved loadouts yet. Create one to get started!</p>
        </div>

        <div v-else class="loadouts-list">
          <div v-for="(l, idx) in loadouts" :key="l.id" class="loadout-item card mb-3 shadow-sm p-3">
            <div class="card-body">
              <div class="d-flex gap-2 align-items-center">
                <div class="loadout-thumbnail">
                  <img :src="l.imageUrl || 'https://placehold.co/80x80.png'" alt="creature thumbnail" class="rounded" />
                </div>

                <div class="flex-grow-1">
                  <h5 class="mb-0 text-start fs-6">{{ l.name }}</h5>
                  <div class="loadout-meta d-flex gap-2 align-items-center mb-1">
                    <span class="badge bg-light text-black">Lv {{ l.level }}</span>
                    <span class="badge" :style="{ backgroundColor: getTypeColor(l.type1) }">{{ l.type1 }}</span>
                    <span v-if="l.type2 && l.type2 !== '--'" class="badge" :style="{ backgroundColor: getTypeColor(l.type2) }">{{ l.type2 }}</span>
                  </div>

                  <div class="stats-preview d-flex gap-2 flex-wrap">
                    <span v-for="(s, si) in l.stats.slice(0, 8)" :key="si" class="stat-badge">{{ ['HP','ATK','DEF','SPA','SPD','SPE','RES','LCK'][si] }}: <strong>{{ s.base }}</strong></span>
                  </div>
                </div>

                <div class="loadout-actions d-flex gap-2">
                  <button class="btn btn-sm btn-outline-primary" @click="openEdit(idx)">Edit</button>
                  <button class="btn btn-sm btn-outline-danger" @click="deleteLoadout(idx)">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Card Overlay: Create/Edit Loadout -->
    <div v-if="showModal" class="form-overlay-backdrop" @click="closeModal">
      <div class="card form-overlay-card shadow-lg" @click.stop>
        <div class="card-header text-black bg-light d-flex justify-content-between align-items-center">
          <h5 class="mb-0">{{ editingIndex === -1 ? 'Create Loadout' : 'Edit Loadout' }}</h5>
          <button type="button" class="close-button" @click="closeModal" aria-label="Close">✕</button>
        </div>
        <div class="card-body" style="max-height: 70vh; overflow-y: auto;">
          <div class="mb-3">
            <label class="form-label fw-bold">Creature Name</label>
            <input v-model="current.name" class="form-control form-control-lg" placeholder="Enter creature name..." />
          </div>

          <div class="mb-3">
            <label class="form-label fw-bold">Creature Image</label>
            <div class="image-upload-wrapper">
              <div class="image-preview-container">
                <img :src="current.imageUrl || 'https://placehold.co/200x200.png'" alt="creature" class="img-fluid rounded" />
              </div>
              <button class="btn btn-outline-primary btn-sm mt-2 w-100" @click="$refs.imageInputModal.click()">
                <i class="bi bi-upload me-1"></i>
                {{ current.imageUrl ? 'Change Image' : 'Upload Image' }}
              </button>
              <input ref="imageInputModal" type="file" accept="image/*" class="d-none" @change="handleImageUpload" />
              <div v-if="current.imageUrl" class="text-center mt-1">
                <button class="btn btn-link btn-sm text-danger" @click="removeImage">Remove Image</button>
              </div>
            </div>
          </div>

          <LoadoutForm :creature="current" :types="types" :categories="categories" :onStatsChange="onStatsChange" />
        </div>
        <div class="card-footer d-flex gap-2 justify-content-end">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="saveFromModal">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import LoadoutForm from '../components/LoadoutForm.vue'
import sampleLoadoutsData from '../assets/sample_loadouts.json'

const STORAGE_KEY = 'genomix_loadouts_v1'
const FIRST_VISIT_KEY = 'genomix_first_visit_done'

const types = [
  'Slime','Flame','Water','Plant','Electric','Earth','Ice','Poison','Dark','Psychic','Gravity','Alloy','Time','Luck','Light','Crystal','Spirit','Mystic','Storm','Lunar','Wind','Decay','--'
]
const categories = ['Physical','Special','Status']

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) { return [] }
}

const loadouts = ref(loadSaved())

// Calculate storage size for display
const storageSize = computed(() => {
  const bytes = JSON.stringify(loadouts.value).length
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
})

// Auto-import sample loadouts on first visit
async function autoImportSamples() {
  const firstVisitDone = localStorage.getItem(FIRST_VISIT_KEY)
  if (firstVisitDone || loadouts.value.length > 0) {
    return // Skip if already imported or user has loadouts
  }
  
  try {
    const samples = sampleLoadoutsData
    if (Array.isArray(samples) && samples.length > 0) {
      samples.forEach((s, i) => {
        s.id = Date.now() + i
        loadouts.value.push(s)
      })
      persist()
      localStorage.setItem(FIRST_VISIT_KEY, 'true')
      console.log('Sample loadouts imported successfully')
    }
  } catch (err) {
    console.error('Failed to auto-import samples:', err)
  }
}

// Manual load sample loadouts
function loadSampleLoadouts() {
  try {
    const samples = sampleLoadoutsData
    if (!Array.isArray(samples) || samples.length === 0) {
      alert('No sample data available')
      return
    }
    
    if (confirm(`This will add ${samples.length} sample loadouts. Continue?`)) {
      samples.forEach((s, i) => {
        const newLoadout = { ...s }
        newLoadout.id = Date.now() + i
        loadouts.value.push(newLoadout)
      })
      persist()
      alert(`Successfully loaded ${samples.length} sample loadouts!`)
    }
  } catch (err) {
    console.error('Failed to load sample loadouts:', err)
    alert('Failed to load sample loadouts. Check console for details.')
  }
}

onMounted(() => {
  autoImportSamples()
})

// Modal control for create/edit form
const showModal = ref(false)

function openCreate() {
  resetCurrent()
  editingIndex.value = -1
  showModal.value = true
}

function openEdit(idx) {
  const model = JSON.parse(JSON.stringify(loadouts.value[idx]))
  if (!model.moves || model.moves.length < 4) {
    model.moves = Array.from({ length: 4 }, (_, i) =>
      model.moves && model.moves[i]
        ? model.moves[i]
        : { name: '', power: 0, accuracy: 100, type: '--', category: 'Physical' }
    )
  }
  Object.keys(model).forEach(k => current[k] = model[k])
  editingIndex.value = idx
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function saveFromModal() {
  saveLoadout()
  showModal.value = false
}

function persist() {
  try {
    const data = JSON.stringify(loadouts.value)
    localStorage.setItem(STORAGE_KEY, data)
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('Storage quota exceeded! Try:\n1. Delete some old loadouts\n2. Remove large images\n3. Export your loadouts and clear storage')
      console.error('Storage quota exceeded. Current loadouts size:', JSON.stringify(loadouts.value).length, 'bytes')
    } else {
      alert('Failed to save: ' + e.message)
      console.error('Failed to persist loadouts', e)
    }
  }
}

function emptyCreature() {
  return {
    id: Date.now(),
    name: '',
    imageUrl: '',
    type1: '--',
    type2: '--',
    nature: '--',
    level: 1,
    currentHp: 0,
    hpPercent: 100,
    stats: Array.from({ length: 8 }, () => ({ base: 10, iv: 0, ev: 0, total: 10, boost: 0, boostedTotal: 10 })),
    moves: [
      { name: '', power: 0, accuracy: 100, type: '--', category: 'Physical' },
      { name: '', power: 0, accuracy: 100, type: '--', category: 'Physical' },
      { name: '', power: 0, accuracy: 100, type: '--', category: 'Physical' },
      { name: '', power: 0, accuracy: 100, type: '--', category: 'Physical' }
    ],
  }
}

const editingIndex = ref(-1)
const current = reactive(emptyCreature())

function resetCurrent() {
  const fresh = emptyCreature()
  Object.keys(fresh).forEach(k => current[k] = fresh[k])
  editingIndex.value = -1
}

function handleImageUpload(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  
  // Check file size (limit to 500KB)
  if (file.size > 500 * 1024) {
    alert('Image too large! Please use an image smaller than 500KB.')
    e.target.value = ''
    return
  }
  
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      // Compress image to max 300x300
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      let width = img.width
      let height = img.height
      const maxSize = 300
      
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width
        width = maxSize
      } else if (height > maxSize) {
        width = (width * maxSize) / height
        height = maxSize
      }
      
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      
      // Convert to JPEG with 0.7 quality for better compression
      current.imageUrl = canvas.toDataURL('image/jpeg', 0.7)
    }
    img.src = String(reader.result)
  }
  reader.readAsDataURL(file)
  e.target.value = '' // clear input
}

function removeImage() {
  current.imageUrl = ''
}

const typeColors = {
  Slime: '#A5D6A7', Flame: '#EF5350', Water: '#42A5F5', Plant: '#43A047',
  Electric: '#FBC02D', Earth: '#D7B98E', Ice: '#A7E2EB', Poison: '#BCA9F5',
  Dark: '#616161', Psychic: '#E1A9B8', Gravity: '#7C6BAF', Alloy: '#C0C0C0',
  Time: '#0097A7', Luck: '#9AF59A', Light: '#EAD9A6', Crystal: '#AEE7EC',
  Spirit: '#E6B0E6', Mystic: '#8E7CC3', Storm: '#3F51B5', Lunar: '#757575',
  Wind: '#CFD8DC', Decay: '#4B622B', '--': '#CFD8DC'
}

function getTypeColor(type) {
  return typeColors[type] || '#CFD8DC'
}

function onStatsChange(c) {
  // simple hook — creature card updates the reactive object directly
}

function saveLoadout() {
  if (!current.name || current.name.trim() === '') {
    alert('Please provide a name for the loadout')
    return
  }

  const snapshot = JSON.parse(JSON.stringify(current))
  if (editingIndex.value === -1) {
    snapshot.id = Date.now()
    loadouts.value.unshift(snapshot)
  } else {
    loadouts.value[editingIndex.value] = snapshot
  }
  persist()
  resetCurrent()
}

function deleteLoadout(idx) {
  if (!confirm('Delete this loadout?')) return
  loadouts.value.splice(idx, 1)
  persist()
}

function deleteAllLoadouts() {
  if (!confirm(`⚠️ Are you sure you want to delete ALL ${loadouts.value.length} loadouts?\n\nThis action cannot be undone!`)) return
  loadouts.value = []
  persist()
}

function loadIntoEditor(idx) {
  const model = JSON.parse(JSON.stringify(loadouts.value[idx]))
  // Ensure 4 moves exist
  if (!model.moves || model.moves.length < 4) {
    model.moves = Array.from({ length: 4 }, (_, i) => 
      model.moves && model.moves[i] ? model.moves[i] : { name: '', power: 0, accuracy: 100, type: '--', category: 'Physical' }
    )
  }
  Object.keys(model).forEach(k => current[k] = model[k])
  editingIndex.value = idx
}

function applyLoadout(idx) {
  // dispatch a window event so the damage calculator can pick it up and apply to its creature
  try {
    const payload = JSON.parse(JSON.stringify(loadouts.value[idx]))
    window.dispatchEvent(new CustomEvent('genomix:applyLoadout', { detail: payload }))
  } catch (e) {
    console.error('Failed to dispatch loadout', e)
  }
}

function exportLoadouts() {
  const data = JSON.stringify(loadouts.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'genomix_loadouts.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function handleImport(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result))
      if (!Array.isArray(parsed)) {
        alert('Imported JSON must be an array of loadouts')
        return
      }
      
      // Check if import would exceed reasonable size
      const importSize = JSON.stringify(parsed).length
      const currentSize = JSON.stringify(loadouts.value).length
      const totalSize = importSize + currentSize
      
      // Warn if combined size is large (5MB localStorage limit, use 4MB as threshold)
      if (totalSize > 4 * 1024 * 1024) {
        if (!confirm(`Warning: Importing these loadouts may exceed storage limits.\nCurrent: ${(currentSize/1024).toFixed(0)}KB, Import: ${(importSize/1024).toFixed(0)}KB\n\nContinue anyway?`)) {
          return
        }
      }
      
      // append imported loadouts, ensure unique ids
      parsed.forEach((it, i) => {
        it.id = Date.now() + i
        loadouts.value.unshift(it)
      })
      persist()
    } catch (err) {
      if (err.name === 'QuotaExceededError') {
        alert('Storage quota exceeded! Cannot import. Try deleting some existing loadouts first.')
      } else {
        alert('Failed to import JSON: ' + err.message)
      }
      console.error('Import error', err)
    }
  }
  reader.readAsText(f)
  // clear input
  e.target.value = ''
}

</script>

<style scoped>
.loadouts-container {
  max-width: 1400px;
  margin: 0 auto;
}

.editor-card {
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.editor-card .card-header {
  border-bottom: 2px solid rgba(255,255,255,0.2);
  padding: 1rem 1.25rem;
}

.image-upload-wrapper {
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.image-preview-container {
  width: 100%;
  max-width: 200px;
  margin: 0 auto;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
  background: white;
  border: 2px solid #dee2e6;
}

.image-preview-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.saved-loadouts-card {
  background: transparent;
}

.loadouts-list {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding-right: 0.5rem;
}

.loadout-item {
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #e0e0e0;
}

.loadout-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
  border-color: #0d6efd;
}

.loadout-thumbnail {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  background: white;
}

.loadout-thumbnail {
  width: 68px;
  height: 68px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background: white;
}
.loadout-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.stat-badge {
  background: #f1f3f5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: #495057;
}

.loadout-actions {
  flex-shrink: 0;
}

.loadout-actions button {
  min-width: 72px;
  height: 36px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loadout-item .card-body {
  padding-top: 0.25rem !important;
  padding-bottom: 0.25rem !important;
  padding-left: 0.6rem !important;
  padding-right: 0.6rem !important;
}

.loadout-item h5 {
  font-size: 1rem;
  margin-bottom: 0.15rem;
}

.stat-badge {
  font-size: 0.72rem;
  padding: 0.2rem 0.45rem;
}

.empty-state {
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px dashed #dee2e6;
}

/* Responsive adjustments */
@media (max-width: 991px) {
  .editor-card {
    position: relative;
    top: 0;
    max-height: none;
  }
  
  .loadouts-list {
    max-height: none;
  }
}

/* Scrollbar styling */
.loadouts-list::-webkit-scrollbar,
.editor-card::-webkit-scrollbar {
  width: 8px;
}

.loadouts-list::-webkit-scrollbar-track,
.editor-card::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.loadouts-list::-webkit-scrollbar-thumb,
.editor-card::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.loadouts-list::-webkit-scrollbar-thumb:hover,
.editor-card::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Form Overlay Card Styles */
.form-overlay-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.form-overlay-card {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  animation: slideDown 0.3s ease-out;
  border: none;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-overlay-card .card-header {
  padding: 1rem 1rem;
}

.form-overlay-card .card-body {
  padding: 1rem;
}

.form-overlay-card .card-footer {
  padding: 1rem 1rem;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
}

.close-button {
  background: none;
  border: none;
  color: #dc3545;
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, opacity 0.2s;
  opacity: 0.9;
}

.close-button:hover {
  opacity: 1;
  transform: scale(1.1);
}
</style>
