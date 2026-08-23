const fs = require('fs');
const file = 'app/pages/[slug]/whatsapp/contacts/index.vue';
let content = fs.readFileSync(file, 'utf8');

// Replace everything between <!-- MODAL / DRAWER RIWAYAT CHAT PER KONTAK --> and <!-- MODAL RINCIAN & METADATA GRUP WHATSAPP -->
content = content.replace(/<!-- MODAL \/ DRAWER RIWAYAT CHAT PER KONTAK -->[\s\S]*?<!-- MODAL RINCIAN & METADATA GRUP WHATSAPP -->/m, '<!-- MODAL RINCIAN & METADATA GRUP WHATSAPP -->');

fs.writeFileSync(file, content);
