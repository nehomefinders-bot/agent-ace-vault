import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.endlessprospects.app',
  appName: 'Endless Prospects',
  webDir: 'dist/client',
  server: {
    // Paste your live hosted website URL or Cloudflare Pages link here
    url: 'https://agent-ace-vault.lovable.app/', 
    cleartext: true
  }
};

export default config;