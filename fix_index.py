import sys

with open('app/pages/[slug]/whatsapp/contacts/index.vue', 'r') as f:
    lines = f.readlines()

def del_lines(start, end):
    for i in range(start-1, end):
        lines[i] = None

lines[1032] = 'import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from "vue";\nimport { useRouter, useRoute } from "vue-router";\nimport { useGlobalWhatsappChat } from "@/composables/useGlobalWhatsappChat";\n'

del_lines(1043, 1051)
del_lines(1090, 1102)
del_lines(1157, 1192)

for i in range(1436, 1567):
    lines[i] = None
lines[1436] = 'const { openChat } = useGlobalWhatsappChat();\nconst openContactHistoryModal = (contact: any) => {\n  openChat(contact);\n};\n'

del_lines(650, 890)

# Replace the old onMounted and watch logic for query parameters:
for i, line in enumerate(lines):
    if line and "onMounted(async () => {" in line:
        idx = i
        break

lines[idx] = """
const route = useRoute();
const router = useRouter();
const { slugPath } = useSlugRoute();

const handleQueryNavigation = async () => {
  const phoneQuery = route.query.phone as string;
  const typeQuery = route.query.type as string;
  const nameQuery = route.query.name as string;
  
  if (phoneQuery) {
    if (typeQuery === 'GROUP' || phoneQuery.endsWith('@g.us')) {
      activeTab.value = 'groups';
      if (groups.value.length === 0) {
        await fetchGroups();
      }
      const targetGroup = groups.value.find((g: any) => g.id === phoneQuery) || {
        id: phoneQuery,
        subject: nameQuery || 'Grup WhatsApp'
      };
      
      openContactHistoryModal({ 
        phoneNumber: targetGroup.id, 
        name: targetGroup.subject || targetGroup.name || targetGroup.id,
        isGroup: true,
        chatType: 'GROUP'
      });
    } else {
      activeTab.value = 'contacts';
      const targetContact = contacts.value.find((c: any) => c.phoneNumber === phoneQuery) || {
        phoneNumber: phoneQuery,
        name: nameQuery || phoneQuery,
      };
      
      openContactHistoryModal({
        ...targetContact,
        isGroup: false,
        chatType: 'PERSONAL'
      });
    }
    
    router.replace({ path: slugPath('/whatsapp/contacts'), query: {} });
  }
};

onMounted(async () => {
"""

# Remove old query parameter logic inside onMounted
for i in range(idx+1, idx+20):
    if lines[i] and "const phoneQuery =" in lines[i]:
        del_lines(i+1, i+11)
        break

# Add handleQueryNavigation() to onMounted and watch
for i in range(idx+1, idx+20):
    if lines[i] and "await fetchContacts();" in lines[i]:
        lines[i] = lines[i] + "  handleQueryNavigation();\n"
        break

# Find end of onMounted
for i in range(idx+1, idx+30):
    if lines[i] and "});" in lines[i]:
        lines[i] = lines[i] + "\nwatch(() => route.query, () => {\n  handleQueryNavigation();\n});\n"
        break

new_lines = [l for l in lines if l is not None]

with open('app/pages/[slug]/whatsapp/contacts/index.vue', 'w') as f:
    f.writelines(new_lines)
