const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const unzipper = require("unzipper");
const tar = require("tar");

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

      // Encontrar arquivos de imagem para preview
      const imageFiles = await this.findImageFiles(archivePath);
      console.log(`Found ${imageFiles.length} image files`);

      // Encontrar arquivos de conteúdo
      const contentFiles = await this.findContentFiles(archivePath);
      console.log(`Found ${contentFiles.length} content files`);

      if (imageFiles.length === 0) {
        throw new Error("No image files found in archive for preview");
      }

      // Usar o primeiro arquivo de imagem como preview
      const previewFile = imageFiles[0];
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
      if (contentFiles.length > 0) {
        const contentFile = contentFiles[0];
        if (contentFile && contentFile.name) {
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
        archiveType: this.detectArchiveType(archivePath)
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
