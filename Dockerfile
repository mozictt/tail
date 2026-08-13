# Stage 1: Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency definition files
COPY package*.json ./

# Install dependencies (termasuk devDependencies untuk build)
RUN npm ci

# Copy seluruh source code aplikasi
COPY . .

# Build aplikasi Nuxt 3/4 (menghasilkan folder .output)
RUN npm run build

# Stage 2: Runtime stage (Production image yang sangat efisien dan ringan)
FROM node:24-alpine AS runner

WORKDIR /app

# Environment variables default
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy hanya bundle server yang sudah di-build (.output) dari stage builder
COPY --from=builder /app/.output ./.output

# Expose port aplikasi
EXPOSE 3000

# Jalankan aplikasi Nuxt menggunakan Nitro server bundle
CMD ["node", ".output/server/index.mjs"]
