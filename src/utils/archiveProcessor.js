const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const unzipper = require("unzipper");
const tar = require("tar");
const ImageProcessor = require("./imageProcessor");
const { sanitizeFilename } = require("./filenameSanitizer");

/**
 * Utilitário para processamento de arquivos compactados usando Node.js streams
 */
class ArchiveProcessor {

  /**
   * Detecta o tipo de arquivo compactado
   */
  static detectArchiveType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeMap = {
      '.zip': 'zip',
      '.rar': 'rar',
      '.7z': '7z',
      '.tar': 'tar',
      '.gz': 'gzip',
      '.bz2': 'bzip2'
    };

    return mimeMap[ext] || 'unknown';
  }

  /**
   * Extrai arquivo ZIP usando streams
   */
  static async extractZip(archivePath, extractPath) {
    try {
      const extractStream = unzipper.Extract({ path: extractPath });

      await pipeline(
        fs.createReadStream(archivePath),
        extractStream
      );

      return true;
    } catch (error) {
      console.error("Error extracting ZIP:", error);
      throw error;
    }
  }

  /**
   * Extrai arquivo TAR usando streams
   */
  static async extractTar(archivePath, extractPath) {
    try {
      await tar.extract({
        file: archivePath,
        cwd: extractPath
      });

      return true;
    } catch (error) {
      console.error("Error extracting TAR:", error);
      throw error;
    }
  }

  /**
   * Lista arquivos dentro do arquivo compactado
   */
  static async listArchiveContents(archivePath) {
    const archiveType = this.detectArchiveType(archivePath);

    try {
      if (archiveType === 'zip') {
        const entries = await unzipper.Open.file(archivePath);

        // Verificar se entries e entries.files existem
        if (!entries || !entries.files || !Array.isArray(entries.files)) {
          throw new Error("Invalid ZIP file structure");
        }

        const usedNames = new Map();
        return entries.files.map(file => {
          // Verificar se file existe e tem as propriedades necessárias
          if (!file || !file.path) {
            console.warn("Skipping invalid file entry in ZIP");
            return null;
          }

          // Use a sanitized display name for detection/selection, but keep original for extraction
          const ext = path.extname(file.path).toLowerCase();
          const originalName = file.path;
          const sanitized = sanitizeFilename(path.basename(file.path), 80);
          let base = sanitized.replace(ext, "");
          // Garantir unicidade determinística por arquivo
          const key = base + ext;
          const count = usedNames.get(key) || 0;
          usedNames.set(key, count + 1);
          const displayName = count === 0 ? `${base}${ext}` : `${base}-${count + 1}${ext}`;

          return {
            name: displayName, // sanitized name for logic
            originalName: originalName, // keep original for extraction
            size: file.vars?.uncompressedSize || file.vars?.size || 0,
            isDirectory: file.type === 'Directory'
          };
        }).filter(Boolean); // Remove entradas nulas
      } else if (archiveType === 'tar') {
        const entries = [];
        const usedNames = new Map();
        await tar.list({
          file: archivePath,
          onentry: (entry) => {
            if (entry && entry.path) {
              const ext = path.extname(entry.path).toLowerCase();
              const originalName = entry.path;
              const sanitized = sanitizeFilename(path.basename(entry.path), 80);
              let base = sanitized.replace(ext, "");
              const key = base + ext;
              const count = usedNames.get(key) || 0;
              usedNames.set(key, count + 1);
              const displayName = count === 0 ? `${base}${ext}` : `${base}-${count + 1}${ext}`;

              entries.push({
                name: displayName,
                originalName: originalName,
                size: entry.size || 0,
                isDirectory: entry.type === 'Directory'
              });
            }
          }
        });
        return entries;
      }

      throw new Error(`Unsupported archive type: ${archiveType}`);
    } catch (error) {
      console.error("Error listing archive contents:", error);
      throw error;
    }
  }

  /**
   * Encontra arquivos de imagem dentro do arquivo compactado
   */
  static async findImageFiles(archivePath) {
    const contents = await this.listArchiveContents(archivePath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.psd', '.ai', '.cdr', '.eps', '.webp'];

    return contents.filter(file => {
      if (file.isDirectory) return false;
      try {
        const normalizedName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return (
          normalizedName.endsWith('.jpg') ||
          normalizedName.endsWith('.jpeg') ||
          normalizedName.endsWith('.png') ||
          normalizedName.endsWith('.gif') ||
          normalizedName.endsWith('.svg') ||
          normalizedName.endsWith('.psd') ||
          normalizedName.endsWith('.ai') ||
          normalizedName.endsWith('.cdr') ||
          normalizedName.endsWith('.eps') ||
          normalizedName.endsWith('.webp')
        );
      } catch (_e) {
        const ext = path.extname(file.name).toLowerCase();
        return imageExtensions.includes(ext);
      }
    });
  }

  /**
   * Encontra arquivos de conteúdo (não imagem) dentro do arquivo compactado
   */
  static async findContentFiles(archivePath) {
    const contents = await this.listArchiveContents(archivePath);
    const contentExtensions = ['.zip', '.rar', '.7z', '.psd', '.ai', '.cdr', '.eps', '.pdf'];

    return contents.filter(file => {
      if (file.isDirectory) return false;
      const ext = path.extname(file.name).toLowerCase();
      return contentExtensions.includes(ext);
    });
  }

  /**
   * Extrai arquivo específico do arquivo compactado
   */
  static async extractFileFromArchive(archivePath, fileName, extractPath) {
    const archiveType = this.detectArchiveType(archivePath);

    try {
      if (archiveType === 'zip') {
        const entries = await unzipper.Open.file(archivePath);
        // Recalcular nomes sanitizados com unicidade determinística
        const usedNames = new Map();
        let candidate = null;
        for (const f of entries.files) {
          const ext = path.extname(f.path).toLowerCase();
          const sanitized = sanitizeFilename(path.basename(f.path), 80);
          let base = sanitized.replace(ext, "");
          const key = base + ext;
          const count = usedNames.get(key) || 0;
          usedNames.set(key, count + 1);
          const display = count === 0 ? `${base}${ext}` : `${base}-${count + 1}${ext}`;
          if (display === fileName || f.path === fileName) {
            candidate = f;
            break;
          }
        }
        if (!candidate) {
          throw new Error(`File ${fileName} not found in archive`);
        }

        const outputPath = path.join(extractPath, path.basename(fileName));
        const outputStream = fs.createWriteStream(outputPath);

        await pipeline(
          candidate.stream(),
          outputStream
        );

        return outputPath;
      } else if (archiveType === 'tar') {
        const outputPath = path.join(extractPath, path.basename(fileName));

        const usedNames = new Map();
        await tar.extract({
          file: archivePath,
          cwd: extractPath,
          filter: (p) => {
            // tar filter recebe paths originais; mapear para nome sanitizado único
            const ext = path.extname(p).toLowerCase();
            const sanitized = sanitizeFilename(path.basename(p), 80);
            let base = sanitized.replace(ext, "");
            const key = base + ext;
            const count = usedNames.get(key) || 0;
            usedNames.set(key, count + 1);
            const display = count === 0 ? `${base}${ext}` : `${base}-${count + 1}${ext}`;
            return p === fileName || display === fileName;
          }
        });

        return outputPath;
      }

      throw new Error(`Unsupported archive type: ${archiveType}`);
    } catch (error) {
      console.error(`Error extracting file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Detecta automaticamente qual regra aplicar baseado no conteúdo do arquivo compactado
   * @param {Array} contents - Lista de arquivos no arquivo compactado
   * @returns {Object} - { ruleType: string, description: string, priority: number }
   */
  static detectArchiveRule(contents) {
    try {
      console.log(`🔍 Analisando conteúdo para detectar regra aplicável...`);

      // Filtrar apenas arquivos (não diretórios)
      const files = contents.filter(item => !item.isDirectory);

      // Normalizar nomes de arquivos e extrair extensões de forma mais robusta
      const fileExtensions = files.map(file => {
        try {
          // Normalizar Unicode e limpar caracteres problemáticos
          const normalizedName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const ext = path.extname(normalizedName).toLowerCase();
          console.log(`📄 Arquivo: "${file.name}" -> Normalizado: "${normalizedName}" -> Ext: "${ext}"`);
          return ext;
        } catch (error) {
          console.warn(`⚠️ Erro ao processar nome do arquivo "${file.name}":`, error);
          // Fallback: tentar extrair extensão diretamente
          const ext = path.extname(file.name).toLowerCase();
          return ext;
        }
      });

      console.log(`📁 Arquivos encontrados: ${files.map(f => f.name).join(', ')}`);
      console.log(`🔤 Extensões detectadas: ${fileExtensions.join(', ')}`);

      // REGRA 1: Zip com PSD (maior prioridade)
      if (fileExtensions.includes('.psd')) {
        console.log(`🎯 REGRA DETECTADA: Zip com PSD`);
        return {
          ruleType: 'psd_rule',
          description: 'Zip com PSD - Preview (JPG ou PNG) + .psd',
          priority: 1,
          contentFile: files.find(f => path.extname(f.name).toLowerCase() === '.psd'),
          previewFiles: files.filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f.name).toLowerCase()))
        };
      }

      // REGRA 2: Zip com Vetor (AI, CDR, EPS)
      if (fileExtensions.some(ext => ['.ai', '.cdr', '.eps'].includes(ext))) {
        const vectorFile = files.find(f => ['.ai', '.cdr', '.eps'].includes(path.extname(f.name).toLowerCase()));
        console.log(`🎯 REGRA DETECTADA: Zip com Vetor (${path.extname(vectorFile.name).toUpperCase()})`);
        return {
          ruleType: 'vector_rule',
          description: `Zip com Vetor - Preview (JPG ou PNG) + ${path.extname(vectorFile.name).toUpperCase()}`,
          priority: 2,
          contentFile: vectorFile,
          previewFiles: files.filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f.name).toLowerCase()))
        };
      }

      // REGRA 3: Zip com figurinhas do insta (ZIP dentro de ZIP)
      if (fileExtensions.includes('.zip')) {
        console.log(`🎯 REGRA DETECTADA: Zip com figurinhas do insta`);
        return {
          ruleType: 'instagram_stickers_rule',
          description: 'Zip com figurinhas do insta - Preview (JPG ou PNG) + .zip',
          priority: 3,
          contentFile: files.find(f => path.extname(f.name).toLowerCase() === '.zip'),
          previewFiles: files.filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f.name).toLowerCase()))
        };
      }

      // REGRA 4: Zip com imagem (apenas JPG/JPEG/PNG)
      if (fileExtensions.every(ext => ['.jpg', '.jpeg', '.png'].includes(ext))) {
        const imageFiles = files.filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f.name).toLowerCase()));

        if (imageFiles.length === 2) {
          console.log(`🎯 REGRA DETECTADA: Zip com 2 imagens (seleção inteligente)`);
          return {
            ruleType: 'intelligent_image_selection',
            description: 'Zip com 2 imagens - Seleção inteligente baseada em transparência',
            priority: 4,
            contentFile: null, // Será determinado pela seleção inteligente
            previewFiles: imageFiles
          };
        } else if (imageFiles.length === 1) {
          console.log(`🎯 REGRA DETECTADA: Zip com 1 imagem`);
          return {
            ruleType: 'single_image_rule',
            description: 'Zip com imagem - .jpg ou .jpeg (preview é o mesmo do original)',
            priority: 5,
            contentFile: null,
            previewFiles: imageFiles
          };
        }
      }

      // REGRA 5: Padrão (fallback)
      console.log(`🎯 REGRA DETECTADA: Padrão (fallback)`);
      return {
        ruleType: 'default_rule',
        description: 'Regra padrão - Primeira imagem como preview',
        priority: 999,
        contentFile: null,
        previewFiles: files.filter(f => ['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(path.extname(f.name).toLowerCase()))
      };

    } catch (error) {
      console.error('❌ Erro ao detectar regra:', error);
      return {
        ruleType: 'error',
        description: 'Erro ao detectar regra - usando padrão',
        priority: 999,
        contentFile: null,
        previewFiles: []
      };
    }
  }

  /**
   * Seleciona inteligentemente qual imagem usar como preview vs conteúdo
   * NOVA REGRA SIMPLIFICADA: JPG sempre será preview se tiver PNG + JPG
   * @param {Array} imageFiles - Array de arquivos de imagem encontrados
   * @param {string} archivePath - Caminho do arquivo compactado
   * @param {string} tempDir - Diretório temporário
   * @returns {Object} - { previewFile: Object, contentFile: Object, selectionMethod: string }
   */
  static async selectPreviewAndContent(imageFiles, archivePath, tempDir) {
    try {
      // Filtrar apenas imagens (não PSD, AI, CDR) com normalização robusta
      const validImages = imageFiles.filter(file => {
        try {
          const normalizedName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const isValid = /\.(png|jpe?g|gif)$/.test(normalizedName);
          console.log(`🔍 Verificando imagem válida: "${file.name}" -> "${normalizedName}" -> válido: ${isValid}`);
          return isValid;
        } catch (error) {
          console.warn(`⚠️ Erro ao verificar extensão do arquivo "${file.name}":`, error);
          const ext = path.extname(file.name).toLowerCase();
          return ['.png', '.jpg', '.jpeg', '.gif'].includes(ext);
        }
      });

      // Só aplicar a regra se tiver exatamente 2 imagens válidas
      if (validImages.length !== 2) {
        console.log(`Não aplicando regra de seleção inteligente: ${validImages.length} imagens válidas encontradas`);
        return this.selectDefaultPreviewAndContent(imageFiles);
      }

      console.log(`🎯 Aplicando regra de seleção inteligente para 2 imagens: ${validImages.map(f => f.name).join(', ')}`);

      // NOVA REGRA SIMPLIFICADA: Encontrar JPG e PNG com normalização robusta
      const jpgFile = validImages.find(f => {
        try {
          const normalizedName = f.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          return normalizedName.endsWith('.jpg') || normalizedName.endsWith('.jpeg');
        } catch (_e) {
          const ext = path.extname(f.name).toLowerCase();
          return ['.jpg', '.jpeg'].includes(ext);
        }
      });

      const pngFile = validImages.find(f => {
        try {
          const normalizedName = f.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          return normalizedName.endsWith('.png');
        } catch (_e) {
          const ext = path.extname(f.name).toLowerCase();
          return ext === '.png';
        }
      });

      if (jpgFile && pngFile) {
        // NOVA REGRA: JPG sempre será preview
        console.log(`✅ Seleção inteligente (NOVA REGRA): ${jpgFile.name} como PREVIEW (JPG sempre prioridade), ${pngFile.name} como CONTEÚDO`);
        return {
          previewFile: jpgFile,      // JPG como PREVIEW
          contentFile: pngFile,      // PNG como CONTEÚDO
          selectionMethod: 'jpg_always_preview'
        };
      }

      // Se não tiver JPG + PNG, usar lógica padrão
      console.log(`⚠️ Não aplicando nova regra, usando lógica padrão`);
      return this.selectDefaultPreviewAndContent(imageFiles);

    } catch (error) {
      console.error('❌ Erro na seleção inteligente:', error);
      return this.selectDefaultPreviewAndContent(imageFiles);
    }
  }

  /**
   * Lógica padrão de seleção (fallback)
   */
  static selectDefaultPreviewAndContent(imageFiles) {
    // Usar primeira imagem como preview, segunda como conteúdo
    const previewFile = imageFiles[0];
    const contentFile = imageFiles.length > 1 ? imageFiles[1] : null;

    return {
      previewFile: previewFile,
      contentFile: contentFile,
      selectionMethod: 'default'
    };
  }

  /**
   * Processa arquivo compactado e extrai preview + conteúdo
   */
  static async processArchive(archivePath, tempDir) {
    try {
      console.log(`Processing archive: ${archivePath}`);

      // Verificar se o arquivo existe
      if (!fs.existsSync(archivePath)) {
        throw new Error(`Archive file not found: ${archivePath}`);
      }

      // Listar conteúdo do arquivo
      const contents = await this.listArchiveContents(archivePath);
      console.log(`Archive contains ${contents.length} files`);

      if (contents.length === 0) {
        throw new Error("Archive is empty or contains no valid files");
      }

      // DETECÇÃO AUTOMÁTICA DE REGRAS
      const detectedRule = this.detectArchiveRule(contents);
      console.log(`🎯 REGRA APLICADA: ${detectedRule.description}`);
      console.log(`📋 Tipo de regra: ${detectedRule.ruleType}`);

      // Encontrar arquivos de imagem para preview
      const imageFiles = await this.findImageFiles(archivePath);
      console.log(`Found ${imageFiles.length} image files`);

      // Encontrar arquivos de conteúdo
      const contentFiles = await this.findContentFiles(archivePath);
      console.log(`Found ${contentFiles.length} content files`);

      if (imageFiles.length === 0) {
        throw new Error("No image files found in archive for preview");
      }

      // NOVA LÓGICA: Seleção inteligente quando há 2 imagens
      let previewFile, contentFile, selectionMethod;

      // Aplicar regra específica baseada na detecção
      switch (detectedRule.ruleType) {
        case 'psd_rule':
          // REGRA 1: Zip com PSD
          previewFile = detectedRule.previewFiles[0]; // Primeira imagem como preview
          contentFile = detectedRule.contentFile; // PSD como conteúdo
          selectionMethod = 'psd_rule';
          console.log(`🎨 Aplicando regra PSD: ${previewFile.name} como preview, ${contentFile.name} como conteúdo`);
          break;

        case 'vector_rule':
          // REGRA 2: Zip com Vetor
          previewFile = detectedRule.previewFiles[0]; // Primeira imagem como preview
          contentFile = detectedRule.contentFile; // AI/CDR/EPS como conteúdo
          selectionMethod = 'vector_rule';
          console.log(`🎨 Aplicando regra Vetor: ${previewFile.name} como preview, ${contentFile.name} como conteúdo`);
          break;

        case 'instagram_stickers_rule':
          // REGRA 3: Zip com figurinhas do insta
          previewFile = detectedRule.previewFiles[0]; // Primeira imagem como preview
          contentFile = detectedRule.contentFile; // ZIP como conteúdo
          selectionMethod = 'instagram_stickers_rule';
          console.log(`📱 Aplicando regra Figurinhas: ${previewFile.name} como preview, ${contentFile.name} como conteúdo`);
          break;

        case 'intelligent_image_selection':
          // REGRA 4: Zip com 2 imagens (seleção inteligente)
          if (detectedRule.previewFiles.length === 2) {
            const selection = await this.selectPreviewAndContent(detectedRule.previewFiles, archivePath, tempDir);
            previewFile = selection.previewFile;
            contentFile = selection.contentFile;
            selectionMethod = selection.selectionMethod;
            console.log(`🎯 Aplicando seleção inteligente: ${previewFile.name} como preview, ${contentFile.name} como conteúdo`);
          } else {
            throw new Error("Seleção inteligente requer exatamente 2 imagens");
          }
          break;

        case 'single_image_rule':
          // REGRA 5: Zip com 1 imagem
          previewFile = detectedRule.previewFiles[0];
          contentFile = null; // Sem arquivo de conteúdo separado
          selectionMethod = 'single_image_rule';
          console.log(`🖼️ Aplicando regra imagem única: ${previewFile.name} como preview`);
          break;

        default:
          // REGRA 6: Padrão (fallback)
          // Tentar aplicar seleção inteligente se houver exatamente JPG+PNG entre várias imagens
          try {
            const twoValid = imageFiles.filter(f => {
              const nm = (f.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
              return /\.(png|jpe?g)$/.test(nm);
            });

            if (twoValid.length === 2) {
              const selection = await this.selectPreviewAndContent(twoValid, archivePath, tempDir);
              previewFile = selection.previewFile;
              contentFile = selection.contentFile;
              selectionMethod = selection.selectionMethod;
              console.log(`🎯 Método de seleção (fallback inteligente): ${selectionMethod}`);
            } else if (imageFiles.length === 2) {
              const selection = await this.selectPreviewAndContent(imageFiles, archivePath, tempDir);
              previewFile = selection.previewFile;
              contentFile = selection.contentFile;
              selectionMethod = selection.selectionMethod;
              console.log(`🎯 Método de seleção: ${selectionMethod}`);
            } else {
              // Lógica existente para outros casos
              previewFile = imageFiles[0];
              contentFile = imageFiles.length > 1 ? imageFiles[1] : null;
              selectionMethod = 'standard';
              console.log(`🔄 Aplicando regra padrão: ${previewFile.name} como preview`);
            }
          } catch (_e) {
            // Fallback final
            previewFile = imageFiles[0];
            contentFile = imageFiles.length > 1 ? imageFiles[1] : null;
            selectionMethod = 'standard';
            console.log(`🔄 Aplicando regra padrão (erro): ${previewFile?.name}`);
          }
          break;
      }

      if (!previewFile || !previewFile.name) {
        throw new Error("Invalid preview file structure");
      }

      console.log(`Using ${previewFile.name} as preview`);

      // Extrair arquivo de preview
      const previewPath = await this.extractFileFromArchive(
        archivePath,
        previewFile.name,
        tempDir
      );

      // Verificar se o preview foi extraído com sucesso
      if (!previewPath || !fs.existsSync(previewPath)) {
        throw new Error("Failed to extract preview file");
      }

      // Extrair arquivo de conteúdo (se houver)
      let contentPath = null;
      if (contentFile) {
        console.log(`Using ${contentFile.name} as content`);

        contentPath = await this.extractFileFromArchive(
          archivePath,
          contentFile.name,
          tempDir
        );

        // Verificar se o conteúdo foi extraído com sucesso
        if (contentPath && !fs.existsSync(contentPath)) {
          console.warn("Content file extraction failed, continuing without content");
          contentPath = null;
        }
      }

      return {
        preview: {
          name: previewFile.name,
          path: previewPath,
          size: previewFile.size || 0
        },
        content: contentPath ? {
          name: path.basename(contentPath),
          path: contentPath,
          size: fs.statSync(contentPath).size
        } : null,
        archiveType: this.detectArchiveType(archivePath),
        selectionMethod: selectionMethod, // Como foi feita a seleção
        ruleApplied: detectedRule.ruleType, // Qual regra foi aplicada
        ruleDescription: detectedRule.description, // Descrição da regra
        totalImages: imageFiles.length
      };

    } catch (error) {
      console.error("Error processing archive:", error);
      throw error;
    }
  }

  /**
   * Gera nome baseado no arquivo de preview
   */
  static generateBaseName(previewFileName) {
    const nameWithoutExt = path.parse(previewFileName).name;
    return nameWithoutExt.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  }

  /**
   * Detecta formato baseado no arquivo de conteúdo
   */
  static detectContentFormat(contentPath) {
    if (!contentPath) return 'UNKNOWN';

    const ext = path.extname(contentPath).toLowerCase();
    const formatMap = {
      '.psd': 'PSD',
      '.ai': 'AI',
      '.cdr': 'CDR',
      '.eps': 'EPS',
      '.zip': 'ZIP',
      '.rar': 'RAR',
      '.7z': '7Z',
      '.pdf': 'PDF'
    };

    return formatMap[ext] || ext.substring(1).toUpperCase();
  }

  /**
   * Limpa arquivos temporários
   */
  static async cleanupTempFiles(files) {
    try {
      for (const file of files) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`Cleaned up: ${file}`);
        }
      }
    } catch (error) {
      console.error("Error cleaning up temp files:", error);
    }
  }
}

module.exports = ArchiveProcessor;
