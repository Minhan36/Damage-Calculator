<script setup>
import { useRouter } from 'vue-router'
</script>

<template>
  <div>
  <nav class="navbar navbar-expand-lg navbar-dark fixed-top" style="z-index:1030; background-color: #2a2a2a;">
      <div class="container-fluid">
        <a class="navbar-brand fw-bold d-flex align-items-center" href="#" @click.prevent="$router.push('/')">
          <img src="./assets/logo.png" alt="Logo" height="40" class="me-2" />
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navMenu">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <router-link class="nav-link" to="/">Damage Calc</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/loadouts">Creature Loadouts</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/type-chart">Type Chart</router-link>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <main class="container my-3" style="padding-top:70px;">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.navbar-brand { color: #ffffff }
.nav-link { color: #ffffff !important }
.nav-link.router-link-active { font-weight: 600; color: #b3c3f2 !important }
.navbar { padding: 0.5rem 1rem }
.navbar .me-2 { margin-right: .5rem }
</style>
