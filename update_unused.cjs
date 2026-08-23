const fs = require('fs');
const file = 'app/pages/[slug]/whatsapp/contacts/index.vue';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const sortedChatLogs = computed\(\(\) => \{[\s\S]*?\}\);/m, '');
content = content.replace(/\/\/ Helper parsing pengirim pesan grup[\s\S]*?const parseGroupSender = \([\s\S]*?\}\);/m, '');
content = content.replace(/const getMessageSenderLabel = \([\s\S]*?\}\);/m, '');

fs.writeFileSync(file, content);
