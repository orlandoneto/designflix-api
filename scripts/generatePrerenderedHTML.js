#!/usr/bin/env node

/**
 * Script para gerar HTMLs pré-renderizados para bots
 * 
 * Uso:
 * node scripts/generatePrerenderedHTML.js
 * 
 * Este script gera HTMLs estáticos otimizados para SEO/Social Media
 * que são servidos quando bots (Google, Facebook, Telegram, etc.) acessam o site.
 */

const fs = require('fs');
const path = require('path');
const BotDetectionMiddleware = require('../src/middleware/botDetection');

// Configurações
const PRERENDERED_DIR = path.join(__dirname, '../public/prerendered');
const botDetection = new BotDetectionMiddleware();

// Dados para diferentes páginas
const pagesData = {
  'index.html': {
    title: 'Flixdesign - Sua galeria de design',
    description: 'Flixdesign: Plataforma para designers compartilharem, atualizarem e exibirem seus trabalhos em uma galeria moderna.',
    image: '/favflix.png',
    url: process.env.FRONTEND_URL || 'https://flixdesign.com.br'
  },

  'templates.html': {
    title: 'Templates Premium - Flixdesign',
    description: 'Coleção exclusiva de templates profissionais para web, mobile e print. Designs modernos e responsivos prontos para uso.',
    image: '/favflix.png',
    url: `${process.env.FRONTEND_URL || 'https://flixdesign.com.br'}/templates`
  },

  'categories.html': {
    title: 'Categorias de Design - Flixdesign',
    description: 'Explore nossa coleção de recursos de design organizados por categoria. Encontre exatamente o que precisa para seu projeto.',
    image: '/favflix.png',
    url: `${process.env.FRONTEND_URL || 'https://flixdesign.com.br'}/categories`
  },

  'contributors.html': {
    title: 'Contribuidores - Flixdesign',
    description: 'Conheça nossos talentosos contribuidores e explore seus trabalhos exclusivos de design.',
    image: '/favflix.png',
    url: `${process.env.FRONTEND_URL || 'https://flixdesign.com.br'}/contributors`
  },

  'about.html': {
    title: 'Sobre o Flixdesign',
    description: 'A plataforma líder em recursos de design premium. Conectamos designers talentosos com profissionais criativos.',
    image: '/favflix.png',
    url: `${process.env.FRONTEND_URL || 'https://flixdesign.com.br'}/about`
  }
};

/**
 * Gera todos os HTMLs pré-renderizados
 */
async function generateAllHTMLs() {
  console.log('🚀 Iniciando geração de HTMLs pré-renderizados...\n');

  // Garantir que o diretório existe
  if (!fs.existsSync(PRERENDERED_DIR)) {
    fs.mkdirSync(PRERENDERED_DIR, { recursive: true });
    console.log('📁 Diretório criado:', PRERENDERED_DIR);
  }

  let generatedCount = 0;

  for (const [filename, pageData] of Object.entries(pagesData)) {
    try {
      const html = botDetection.generateBotHTML(pageData);
      const filePath = path.join(PRERENDERED_DIR, filename);

      fs.writeFileSync(filePath, html, 'utf8');
      console.log(`✅ Gerado: ${filename}`);
      generatedCount++;

    } catch (error) {
      console.error(`❌ Erro ao gerar ${filename}:`, error.message);
    }
  }

  console.log(`\n🎉 Concluído! ${generatedCount} arquivos gerados em: ${PRERENDERED_DIR}`);

  // Listar arquivos gerados
  const files = fs.readdirSync(PRERENDERED_DIR);
  console.log('\n📋 Arquivos gerados:');
  files.forEach(file => {
    const stats = fs.statSync(path.join(PRERENDERED_DIR, file));
    console.log(`   ${file} (${Math.round(stats.size / 1024)}KB)`);
  });
}

/**
 * Gera HTML para uma página específica
 */
function generatePageHTML(filename, pageData) {
  const html = botDetection.generateBotHTML(pageData);
  const filePath = path.join(PRERENDERED_DIR, filename);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✅ HTML gerado: ${filename}`);
}

/**
 * Limpa todos os HTMLs pré-renderizados
 */
function cleanPrerenderedHTMLs() {
  if (fs.existsSync(PRERENDERED_DIR)) {
    const files = fs.readdirSync(PRERENDERED_DIR);
    files.forEach(file => {
      fs.unlinkSync(path.join(PRERENDERED_DIR, file));
    });
    console.log(`🧹 Limpeza concluída! ${files.length} arquivos removidos.`);
  } else {
    console.log('📁 Diretório não existe, nada para limpar.');
  }
}

// Execução baseada nos argumentos da linha de comando
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'generate':
  case 'gen':
    generateAllHTMLs();
    break;

  case 'clean':
    cleanPrerenderedHTMLs();
    break;

  case 'help':
  case '--help':
  case '-h':
    console.log(`
🤖 Gerador de HTML Pré-renderizado para Bots

Comandos disponíveis:
  generate, gen    Gera todos os HTMLs pré-renderizados
  clean           Remove todos os HTMLs pré-renderizados
  help, --help    Mostra esta ajuda

Exemplos:
  node scripts/generatePrerenderedHTML.js generate
  node scripts/generatePrerenderedHTML.js clean
  node scripts/generatePrerenderedHTML.js help

Variáveis de ambiente necessárias:
  FRONTEND_URL    URL do frontend (opcional, padrão: https://flixdesign.com)
    `);
    break;

  default:
    console.log('❌ Comando não reconhecido. Use "help" para ver os comandos disponíveis.');
    process.exit(1);
}

module.exports = {
  generateAllHTMLs,
  generatePageHTML,
  cleanPrerenderedHTMLs
};
