const path = require('path');

/**
 * Utilitário para geração automática de tags baseado no nome do arquivo
 */
class TagGenerator {
  static JUNK_WORDS = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'among', 'within', 'without',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall',
    // dumps de câmera / whatsapp
    'whatsapp', 'image', 'img', 'photo', 'foto', 'screenshot', 'screen',
    'shot', 'copy', 'arquivo', 'file', 'download', 'edited', 'null',
    'undefined', 'jpeg', 'jpg', 'png', 'webp', 'heic', 'psd', 'gif',
  ]);

  static tokenize(fileName) {
    const nameWithoutExt = path.parse(fileName).name;
    return nameWithoutExt
      .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .split(' ')
      .filter(Boolean);
  }

  static isJunkToken(word) {
    if (!word || word.length < 3) return true;
    if (TagGenerator.JUNK_WORDS.has(word)) return true;
    // datas / horas / ids numéricos
    if (/^\d+$/.test(word)) return true;
    if (/^\d{1,4}$/.test(word)) return true;
    return false;
  }

  /** Tag é dump de nome de arquivo (ex.: WhatsApp Image 2026-08-25...) */
  static isFilenameDumpTag(tagName) {
    if (!tagName || typeof tagName !== 'string') return true;
    const lower = tagName.toLowerCase();
    if (lower.includes('whatsapp')) return true;
    if (lower.includes('screenshot')) return true;
    const words = lower.split(/\s+/).filter(Boolean);
    if (words.length >= 5) {
      const junkCount = words.filter((w) => TagGenerator.isJunkToken(w)).length;
      if (junkCount / words.length >= 0.5) return true;
    }
    return false;
  }

  /**
   * Gera tags baseado no nome do arquivo
   */
  static generateTagsFromFileName(fileName, categoryName = '') {
    try {
      const words = TagGenerator.tokenize(fileName);

      const tags = words
        .filter((word) => !TagGenerator.isJunkToken(word))
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .filter((tag, index, arr) => arr.indexOf(tag) === index)
        .slice(0, 10);

      if (categoryName && categoryName.trim()) {
        const cleanCategory = categoryName.trim();
        if (!tags.includes(cleanCategory)) {
          tags.unshift(cleanCategory);
        }
      }

      const fileExt = path.extname(fileName).toLowerCase().substring(1).toUpperCase();
      if (fileExt && !tags.includes(fileExt)) {
        tags.push(fileExt);
      }

      return tags;
    } catch (error) {
      console.error('Error generating tags from filename:', error);
      return [];
    }
  }

  /**
   * Gera termos para busca (name + tags + category)
   */
  static generateTerms(fileName, tags, categoryName = '') {
    try {
      const nameWithoutExt = path.parse(fileName).name;
      const cleanName = nameWithoutExt
        .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const tagsString = (tags || []).join(', ');
      const categoryString = categoryName ? categoryName.trim() : '';

      const terms = [cleanName, tagsString, categoryString]
        .filter((term) => term && term.trim())
        .join(', ');

      return terms;
    } catch (error) {
      console.error('Error generating terms:', error);
      return fileName;
    }
  }

  static normalizeFileName(fileName) {
    try {
      const nameWithoutExt = path.parse(fileName).name;
      return nameWithoutExt
        .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      console.error('Error normalizing filename:', error);
      return fileName;
    }
  }

  static detectLanguage(fileName) {
    try {
      const name = fileName.toLowerCase();
      const portugueseWords = [
        'feliz', 'dia', 'dos', 'pais', 'maes', 'filhos', 'familia', 'amor', 'vida', 'trabalho',
      ];
      const englishWords = [
        'happy', 'day', 'father', 'mother', 'family', 'love', 'life', 'work', 'design', 'creative',
      ];

      let ptCount = 0;
      let enCount = 0;

      portugueseWords.forEach((word) => {
        if (name.includes(word)) ptCount++;
      });
      englishWords.forEach((word) => {
        if (name.includes(word)) enCount++;
      });

      if (ptCount > enCount) return 'pt';
      if (enCount > ptCount) return 'en';
      return 'unknown';
    } catch (error) {
      console.error('Error detecting language:', error);
      return 'unknown';
    }
  }

  /**
   * Tags contextuais para o grid: categoria + formato + palavras úteis do nome.
   * Não grava o nome inteiro do WhatsApp/arquivo como uma única tag.
   */
  static generateContextualTags(fileName, format, categoryName = '') {
    try {
      const tags = [];

      if (categoryName && String(categoryName).trim()) {
        tags.push(String(categoryName).trim());
      }

      const fmt = String(format || path.extname(fileName).replace('.', '') || '')
        .trim()
        .toUpperCase();
      if (fmt && !tags.includes(fmt)) {
        tags.push(fmt);
      }

      const fromName = TagGenerator.generateTagsFromFileName(fileName, '')
        .filter((t) => !TagGenerator.isFilenameDumpTag(t))
        .filter((t) => t.toUpperCase() !== fmt);

      for (const tag of fromName) {
        if (!tags.includes(tag) && tags.length < 8) {
          tags.push(tag);
        }
      }

      return tags.length > 0 ? tags : (fmt ? [fmt] : ['Design']);
    } catch (error) {
      console.error('Error generating contextual tags:', error);
      return categoryName ? [String(categoryName).trim()] : ['Design'];
    }
  }

  /**
   * Limpa tags já gravadas (ex.: dump WhatsApp) para resposta pública.
   */
  static sanitizeStoredTags(tags, { categoryName, format } = {}) {
    const list = Array.isArray(tags) ? tags : [];
    const cleaned = list
      .map((t) => {
        if (!t) return null;
        if (typeof t === 'string') return { id: null, name: t };
        return { id: t.id ?? null, name: t.name || '' };
      })
      .filter((t) => t && t.name && !TagGenerator.isFilenameDumpTag(t.name));

    if (cleaned.length > 0) return cleaned;

    // Fallback: gera a partir de categoria/formato
    const fallback = TagGenerator.generateContextualTags(
      'asset',
      format || '',
      categoryName || ''
    );
    return fallback.map((name, i) => ({ id: -(i + 1), name }));
  }
}

module.exports = TagGenerator;
