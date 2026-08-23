const fs = require('fs');
const file = 'app/pages/[slug]/whatsapp/contacts/index.vue';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/import \{ useRouter, useRoute \} from 'vue-router';/, `import { useRouter, useRoute } from 'vue-router';\nimport { useGlobalWhatsappChat } from '@/composables/useGlobalWhatsappChat';`);

content = content.replace(/const openContactHistoryModal = \(contact: any\) => \{[\s\S]*?const closeHistoryModal = \(\) => \{[\s\S]*?cancelReplyTarget\(\);\n\};/m, `const { openChat } = useGlobalWhatsappChat();\nconst openContactHistoryModal = (contact: any) => {\n  openChat(contact);\n};`);

content = content.replace(/const showHistoryModal = ref\(false\);\nconst activeContactHistory = ref<any>\(null\);\nconst chatLogs = ref<any\[\]>\(\[\]\);\nconst chatLogsLoading = ref\(false\);\nconst chatReplyText = ref\(""\);\nconst chatReplyFile = ref<File \| null>\(null\);\nconst sendingChatReply = ref\(false\);\nconst replyingToMessage = ref<any>\(null\);\nconst chatContainerRef = ref<HTMLElement \| null>\(null\);\nconst chatFileInput = ref<HTMLInputElement \| null>\(null\);\nlet chatPollTimer: any = null;/, '');

content = content.replace(/const fetchContactChatLogs = async \([\s\S]*?const submitChatReply = async \(\) => \{[\s\S]*?sendingChatReply\.value = false;\n  \}\n\};/m, '');

content = content.replace(/const scrollToBottom = \(\) => \{[\s\S]*?\}\);/m, '');
content = content.replace(/const sortedChatLogs = computed\(\(\) => \{[\s\S]*?\}\);/m, '');
content = content.replace(/const isImageOrVideo = \([\s\S]*?\}\);/m, '');
content = content.replace(/const getMediaType = \([\s\S]*?\}\);/m, '');
content = content.replace(/const parseGroupSender = \([\s\S]*?\}\);/m, '');
content = content.replace(/const getMessageSenderLabel = \([\s\S]*?\}\);/m, '');
content = content.replace(/const getQuotedMessage = \([\s\S]*?\}\);/m, '');
content = content.replace(/const scrollToQuotedMessage = \([\s\S]*?\}\);/m, '');


// Also remove the modal from template (lines 650 to 890 roughly)
content = content.replace(/<!-- MODAL \/ DRAWER RIWAYAT CHAT PER KONTAK -->[\s\S]*?<!-- MODAL RINCIAN & METADATA GRUP WHATSAPP -->/m, '<!-- MODAL RINCIAN & METADATA GRUP WHATSAPP -->');

fs.writeFileSync(file, content);
