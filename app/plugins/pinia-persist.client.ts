import { defineNuxtPlugin } from "#app";
import persistedState from "pinia-plugin-persistedstate";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.$pinia.use(persistedState); 
});