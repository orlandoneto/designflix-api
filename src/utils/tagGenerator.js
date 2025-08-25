const path = require("path");

/**
 * Utilitário para geração automática de tags baseado no nome do arquivo
 */
class TagGenerator {

  /**
   * Gera tags baseado no nome do arquivo
   */
  static generateTagsFromFileName(fileName, categoryName = '') {
    try {
      // Remove extensão e caracteres especiais
      const nameWithoutExt = path.parse(fileName).name;
      const cleanName = nameWithoutExt
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      // Divide o nome em palavras
      const words = cleanName.split(' ').filter(word => word.length > 2);

      // Lista de palavras comuns para filtrar
      const commonWords = [
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'between', 'among', 'within', 'without',
        'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be',
        'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall'
      ];

      // Filtra palavras comuns e gera tags únicas
      const tags = words
        .filter(word => !commonWords.includes(word))
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicatas
        .slice(0, 10); // Limita a 10 tags

      // Adiciona categoria se fornecida
      if (categoryName && categoryName.trim()) {
        const cleanCategory = categoryName.trim();
        if (!tags.includes(cleanCategory)) {
          tags.unshift(cleanCategory); // Adiciona no início
        }
      }

      // Adiciona formato do arquivo como tag
      const fileExt = path.extname(fileName).toLowerCase().substring(1).toUpperCase();
      if (fileExt && !tags.includes(fileExt)) {
        tags.push(fileExt);
      }

      return tags;
    } catch (error) {
      console.error("Error generating tags from filename:", error);
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
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const tagsString = tags.join(', ');
      const categoryString = categoryName ? categoryName.trim() : '';

      const terms = [cleanName, tagsString, categoryString]
        .filter(term => term && term.trim())
        .join(', ');

      return terms;
    } catch (error) {
      console.error("Error generating terms:", error);
      return fileName;
    }
  }

  /**
   * Normaliza nome do arquivo para exibição
   */
  static normalizeFileName(fileName) {
    try {
      const nameWithoutExt = path.parse(fileName).name;
      return nameWithoutExt
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      console.error("Error normalizing filename:", error);
      return fileName;
    }
  }

  /**
   * Detecta idioma baseado no conteúdo do nome
   */
  static detectLanguage(fileName) {
    try {
      const name = fileName.toLowerCase();

      // Detecção simples baseada em palavras comuns
      const portugueseWords = ['feliz', 'dia', 'dos', 'pais', 'maes', 'filhos', 'familia', 'amor', 'vida', 'trabalho'];
      const englishWords = ['happy', 'day', 'father', 'mother', 'family', 'love', 'life', 'work', 'design', 'creative'];

      let ptCount = 0;
      let enCount = 0;

      portugueseWords.forEach(word => {
        if (name.includes(word)) ptCount++;
      });

      englishWords.forEach(word => {
        if (name.includes(word)) enCount++;
      });

      if (ptCount > enCount) return 'pt';
      if (enCount > ptCount) return 'en';
      return 'unknown';
    } catch (error) {
      console.error("Error detecting language:", error);
      return 'unknown';
    }
  }

  /**
   * Gera UMA tag baseada no nome do arquivo (1 tag por imagem)
   */
  static generateContextualTags(fileName, format, categoryName = '') {
    try {
      // Usar o nome do arquivo como tag principal
      const nameWithoutExt = path.parse(fileName).name;
      const cleanName = nameWithoutExt
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Se o nome estiver vazio, usar o nome original
      if (!cleanName) {
        return [fileName];
      }

      // Criar UMA tag baseada no nome limpo
      const singleTag = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();

      // Retornar array com apenas UMA tag
      return [singleTag];

    } catch (error) {
      console.error("Error generating contextual tags:", error);
      // Fallback: retornar o nome do arquivo como tag
      return [fileName];
    }
  }
}

module.exports = TagGenerator;
