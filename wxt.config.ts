import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Recall It',
    description: 'Save pages as cards and build a knowledge graph',
    permissions: ['storage', 'activeTab', 'tabs'],
    host_permissions: ['<all_urls>'],
  },
});
