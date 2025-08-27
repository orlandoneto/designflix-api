const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const unzipper = require("unzipper");
const tar = require("tar");
const ImageProcessor = require("./imageProcessor");

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

        return entries.files.map(file => {
          // Verificar se file existe e tem as propriedades necessárias
          if (!file || !file.path) {
            console.warn("Skipping invalid file entry in ZIP");
            return null;
          }

          return {
            name: file.path,
            size: file.vars?.uncompressedSize || file.vars?.size || 0,
            isDirectory: file.type === 'Directory'
          };
        }).filter(Boolean); // Remove entradas nulas
      } else if (archiveType === 'tar') {
        const entries = [];
        await tar.list({
          file: archivePath,
          onentry: (entry) => {
            if (entry && entry.path) {
              entries.push({
                name: entry.path,
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
      const ext = path.extname(file.name).toLowerCase();
      return imageExtensions.includes(ext);
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
        const file = entries.files.find(f => f.path === fileName);

        if (!file) {
          throw new Error(`File ${fileName} not found in archive`);
        }

        const outputPath = path.join(extractPath, path.basename(fileName));
        const outputStream = fs.createWriteStream(outputPath);

        await pipeline(
          file.stream(),
          outputStream
        );

        return outputPath;
      } else if (archiveType === 'tar') {
        const outputPath = path.join(extractPath, path.basename(fileName));

        await tar.extract({
          file: archivePath,
          cwd: extractPath,
          filter: (path) => path === fileName
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
      const fileExtensions = files.map(file => path.extname(file.name).toLowerCase());

      console.log(`📁 Arquivos encontrados: ${files.map(f => f.name).join(', ')}`);
      console.log(`🔤 Extensões: ${fileExtensions.join(', ')}`);

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
   * PRIORIDADE: JPG primeiro (fundo brano = transparente), depois PNG (canal alpha real)
   * @param {Array} imageFiles - Array de arquivos de imagem encontrados
   * @param {string} archivePath - Caminho do arquivo compactado
   * @param {string} tempDir - Diretório temporário
   * @returns {Object} - { previewFile: Object, contentFile: Object, selectionMethod: string }
   */
  static async selectPreviewAndContent(imageFiles, archivePath, tempDir) {
    try {
      // Filtrar apenas imagens (não PSD, AI, CDR)
      const validImages = imageFiles.filter(file => {
        const ext = path.extname(file.name).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.gif'].includes(ext);
      });

      // Só aplicar a regra se tiver exatamente 2 imagens válidas
      if (validImages.length !== 2) {
        console.log(`Não aplicando regra de seleção inteligente: ${validImages.length} imagens válidas encontradas`);
        return this.selectDefaultPreviewAndContent(imageFiles);
      }

      console.log(`🎯 Aplicando regra de seleção inteligente para 2 imagens: ${validImages.map(f => f.name).join(', ')}`);

      // Analisar canal alpha de ambas as imagens
      const imageAnalysis = [];

      for (const imageFile of validImages) {
        try {
          // Extrair arquivo temporariamente para análise
          const tempPath = await this.extractFileFromArchive(
            archivePath,
            imageFile.name,
            tempDir
          );

          const imageBuffer = await fs.promises.readFile(tempPath);
          const alphaInfo = await ImageProcessor.analyzeImageAlpha(imageBuffer);

          imageAnalysis.push({
            file: imageFile,
            path: tempPath,
            alphaInfo: alphaInfo
          });

          if (alphaInfo.isJpg) {
            console.log(`📊 Análise ${imageFile.name} (JPG): Fundo brano=${alphaInfo.isTransparent}, ${alphaInfo.whitePercentage.toFixed(1)}% branco`);
          } else {
            console.log(`📊 Análise ${imageFile.name} (PNG): Alpha=${alphaInfo.hasAlpha}, Transparente=${alphaInfo.isTransparent}, ${alphaInfo.alphaPercentage.toFixed(1)}% transparente`);
          }

        } catch (error) {
          console.error(`❌ Erro ao analisar ${imageFile.name}:`, error);
          // Se falhar na análise, usar lógica padrão
          return this.selectDefaultPreviewAndContent(imageFiles);
        }
      }

      // Selecionar baseado na análise com PRIORIDADE JPG
      if (imageAnalysis.length === 2) {
        const [img1, img2] = imageAnalysis;

        // PRIORIDADE 1: Se JPG for transparente (fundo brano), ele SEMPRE será preview
        if (img1.alphaInfo.isJpg && img1.alphaInfo.isTransparent) {
          console.log(`✅ Seleção inteligente (JPG prioridade): ${img1.file.name} como PREVIEW (fundo brano), ${img2.file.name} como CONTEÚDO`);
          return {
            previewFile: img1.file,
            contentFile: img2.file,
            selectionMethod: 'jpg_priority_white_background'
          };
        }

        if (img2.alphaInfo.isJpg && img2.alphaInfo.isTransparent) {
          console.log(`✅ Seleção inteligente (JPG prioridade): ${img2.file.name} como PREVIEW (fundo brano), ${img1.file.name} como CONTEÚDO`);
          return {
            previewFile: img2.file,
            contentFile: img1.file,
            selectionMethod: 'jpg_priority_white_background'
          };
        }

        // PRIORIDADE 2: Se nenhum JPG for transparente, verificar PNG
        if (img1.alphaInfo.isTransparent && !img2.alphaInfo.isTransparent) {
          console.log(`✅ Seleção inteligente (PNG): ${img1.file.name} como PREVIEW (transparente), ${img2.file.name} como CONTEÚDO`);
          return {
            previewFile: img1.file,
            contentFile: img2.file,
            selectionMethod: 'png_alpha_analysis'
          };
        }

        if (img2.alphaInfo.isTransparent && !img1.alphaInfo.isTransparent) {
          console.log(`✅ Seleção inteligente (PNG): ${img2.file.name} como PREVIEW (transparente), ${img1.file.name} como CONTEÚDO`);
          return {
            previewFile: img2.file,
            contentFile: img1.file,
            selectionMethod: 'png_alpha_analysis'
          };
        }

        // Se ambas têm características similares, usar lógica de fallback
        console.log(`⚠️ Ambas imagens têm características similares, usando lógica de fallback`);
      }

      // Fallback para lógica padrão
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
          if (imageFiles.length === 2) {
            // Aplicar regra de seleção inteligente
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
          }
          console.log(`🔄 Aplicando regra padrão: ${previewFile.name} como preview`);
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
