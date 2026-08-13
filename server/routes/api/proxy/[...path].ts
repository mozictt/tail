export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  
  // Gunakan runtimeConfig.backendUrl atau fallback NUXT_BACKEND_URL -> host.docker.internal:4000
  const target = config.backendUrl || process.env.NUXT_BACKEND_URL || process.env.API_BASE || 'http://host.docker.internal:4000';
  
  // Dapatkan sisa path setelah /api/proxy
  const path = event.path.replace(/^\/api\/proxy/, '');
  
  // Lakukan proxy request ke backend secara dinamis di runtime dengan melestarikan header range & content-length
  return proxyRequest(event, `${target}${path}`, {
    onResponse(event, response) {
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        setHeader(event, 'content-length', contentLength);
      }
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        setHeader(event, 'content-range', contentRange);
      }
      const acceptRanges = response.headers.get('accept-ranges');
      if (acceptRanges) {
        setHeader(event, 'accept-ranges', acceptRanges);
      }
    },
  });
});
