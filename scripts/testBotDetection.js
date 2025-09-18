#!/usr/bin/env node

/**
 * Script de teste para o Bot Detection Middleware
 * 
 * Este script testa o middleware simulando diferentes User-Agents de bots
 * e mostra como o HTML é gerado para cada um.
 */

const BotDetectionMiddleware = require('../src/middleware/botDetection');

// Inicializar o middleware
const botDetection = new BotDetectionMiddleware();

// User-Agents de teste
const testUserAgents = [
  {
    name: 'Google Bot',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  },
  {
    name: 'Facebook Bot',
    userAgent: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
  },
  {
    name: 'Telegram Bot',
    userAgent: 'TelegramBot (like TwitterBot)'
  },
  {
    name: 'Twitter Bot',
    userAgent: 'Twitterbot/1.0'
  },
  {
    name: 'WhatsApp Bot',
    userAgent: 'WhatsApp/2.19.81 A'
  },
  {
    name: 'Usuário Normal',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
];

console.log('🤖 Testando Bot Detection Middleware\n');

// Testar detecção de bots
console.log('=== TESTE DE DETECÇÃO ===');
testUserAgents.forEach(test => {
  const isBot = botDetection.isBot(test.userAgent);
  const status = isBot ? '✅ BOT' : '❌ USUÁRIO';
  console.log(`${status} ${test.name}: ${test.userAgent.substring(0, 50)}...`);
});

console.log('\n=== TESTE DE GERAÇÃO DE HTML ===');

// Testar geração de HTML para diferentes páginas
const testPages = [
  {
    name: 'Página Inicial',
    data: {
      title: 'Flixdesign - Sua galeria de design',
      description: 'Flixdesign: Plataforma para designers compartilharem, atualizarem e exibirem seus trabalhos em uma galeria moderna.',
      image: '/favflix.png',
      url: 'https://flixdesign.com.br'
    }
  },
  {
    name: 'Página de Templates',
    data: {
      title: 'Templates Premium - Flixdesign',
      description: 'Coleção exclusiva de templates profissionais para web, mobile e print.',
      image: '/favflix.png',
      url: 'https://flixdesign.com.br/templates'
    }
  },
  {
    name: 'Página de Categoria',
    data: {
      title: 'UI/UX Design - Flixdesign',
      description: 'Explore nossa coleção de recursos de UI/UX Design organizados por categoria.',
      image: '/favflix.png',
      url: 'https://flixdesign.com.br/category/ui-ux'
    }
  }
];

testPages.forEach(page => {
  console.log(`\n📄 ${page.name}:`);
  const html = botDetection.generateBotHTML(page.data);

  // Extrair algumas informações importantes do HTML
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const ogTitleMatch = html.match(/<meta property="og:title" content="(.*?)" \/>/);
  const ogImageMatch = html.match(/<meta property="og:image" content="(.*?)" \/>/);
  const gtmMatch = html.match(/GTM-5HF2H9TM/);

  console.log(`   Título: ${titleMatch ? titleMatch[1] : 'Não encontrado'}`);
  console.log(`   OG Title: ${ogTitleMatch ? ogTitleMatch[1] : 'Não encontrado'}`);
  console.log(`   OG Image: ${ogImageMatch ? ogImageMatch[1] : 'Não encontrado'}`);
  console.log(`   GTM: ${gtmMatch ? '✅ Incluído' : '❌ Não incluído'}`);
  console.log(`   Tamanho: ${Math.round(html.length / 1024)}KB`);
});

console.log('\n=== TESTE DE ARQUIVOS PRÉ-RENDERIZADOS ===');

// Testar geração de arquivos
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '../public/test-prerendered');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

testPages.forEach(page => {
  const filename = page.name.toLowerCase().replace(/\s+/g, '-') + '.html';
  const filePath = path.join(testDir, filename);

  const html = botDetection.generateBotHTML(page.data);
  fs.writeFileSync(filePath, html, 'utf8');

  console.log(`✅ Arquivo gerado: ${filename} (${Math.round(html.length / 1024)}KB)`);
});

console.log(`\n📁 Arquivos de teste salvos em: ${testDir}`);

console.log('\n=== COMANDOS ÚTEIS ===');
console.log('Para gerar HTMLs de produção:');
console.log('  node scripts/generatePrerenderedHTML.js generate');
console.log('');
console.log('Para testar com curl:');
console.log('  curl -H "User-Agent: Googlebot" http://localhost:3000/');
console.log('  curl -H "User-Agent: FacebookExternalHit" http://localhost:3000/');
console.log('  curl -H "User-Agent: TelegramBot" http://localhost:3000/');

console.log('\n🎉 Teste concluído!');
