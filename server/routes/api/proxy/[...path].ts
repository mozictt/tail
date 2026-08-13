export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  
  // Gunakan runtimeConfig.backendUrl atau fallback ke host.docker.internal:4000
  const target = config.backendUrl || process.env.API_BASE || process.env.NUXT_BACKEND_URL || 'http://host.docker.internal:4000';
  
  // Dapatkan sisa path setelah /api/proxy
  const path = event.path.replace(/^\/api\/proxy/, '');
  
  // Lakukan proxy request ke backend secara dinamis di runtime
  return proxyRequest(event, `${target}${path}`);
});
