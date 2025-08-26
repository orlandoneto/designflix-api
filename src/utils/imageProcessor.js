const sharp = require("sharp");
const path = require("path");
const crypto = require("crypto");
const aws = require("aws-sdk");
const EnvironmentPaths = require("./environmentPaths");

// Configurações
const WEBP_QUALITY_IMAGE = 95;
const HEIGHT_IMAGE = 600;
const OPACITY_WATERMARK = 0.1;
const PREVIEW_WIDTH = 1200;

// Instância S3
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  correctClockSkew: true,
});

/**
 * Utilitário centralizado para processamento de imagens
 */
class ImageProcessor {

  /**
 * Detecta o ambiente e retorna os paths corretos do S3
 */
  static getEnvironmentPaths() {
    return EnvironmentPaths.getAllPaths();
  }

  /**
   * Faz upload para S3
   */
  static async uploadToS3(fileName, processedImage, mimeType) {
    await s3
      .putObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: processedImage,
        ContentType: mimeType,
        ACL: "public-read",
      })
      .promise();

    return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
  }

  /**
   * Converte imagem para WebP
   */
  static async convertToWebP(imageBuffer, quality = 80) {
    try {
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error("Invalid image buffer");
      }
      return await sharp(imageBuffer).webp({ quality }).toBuffer();
    } catch (error) {
      console.error("Error converting image to WebP:", error);
      throw error;
    }
  }

  /**
   * Redimensiona imagem mantendo proporção
   */
  static async resizeImage(imageBuffer, options = {}) {
    const { width, height, withoutEnlargement = true } = options;

    try {
      let sharpInstance = sharp(imageBuffer);

      if (width && height) {
        sharpInstance = sharpInstance.resize({ width, height, fit: 'contain', withoutEnlargement });
      } else if (width) {
        sharpInstance = sharpInstance.resize({ width, withoutEnlargement });
      } else if (height) {
        sharpInstance = sharpInstance.resize({ height, withoutEnlargement });
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      console.error("Error resizing image:", error);
      throw error;
    }
  }

  /**
   * Aplica marca d'água suave (para thumbnails)
   */
  static async applySoftWatermark(imageBuffer) {
    try {
      const watermarkPath = path.resolve(__dirname, "../assets/watermark.png");

      // Obter metadados da imagem
      const imageMetadata = await sharp(imageBuffer).metadata();
      if (!imageMetadata || !imageMetadata.width || !imageMetadata.height) {
        throw new Error("Invalid image metadata");
      }

      // Redimensionar para altura máxima
      const targetHeight = Math.min(imageMetadata.height, HEIGHT_IMAGE);
      const resizedBuffer = await this.resizeImage(imageBuffer, { height: targetHeight });

      // Obter metadados da imagem redimensionada
      const resizedMetadata = await sharp(resizedBuffer).metadata();
      const finalWidth = resizedMetadata.width;
      const finalHeight = resizedMetadata.height;

      // Obter metadados da marca d'água
      const watermarkMetadata = await sharp(watermarkPath).metadata();

      // Calcular tamanho da marca d'água (máx 20% da largura, mín 30px)
      const maxWatermarkWidth = Math.max(30, Math.floor(finalWidth * 0.2));
      const watermarkHeight = Math.floor(
        maxWatermarkWidth * (watermarkMetadata.height / watermarkMetadata.width)
      );

      // Verificar se a marca d'água não é maior que a imagem
      if (maxWatermarkWidth > finalWidth || watermarkHeight > finalHeight) {
        throw new Error("Watermark too large for image");
      }

      // Redimensionar marca d'água
      const watermarkBuffer = await sharp(watermarkPath)
        .resize({
          width: maxWatermarkWidth,
          height: watermarkHeight,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

      // Calcular posições da grade
      const cols = Math.max(1, Math.floor(finalWidth / (maxWatermarkWidth * 1.5)));
      const rows = Math.max(1, Math.floor(finalHeight / (watermarkHeight * 1.5)));

      const composites = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const left = Math.floor(col * (maxWatermarkWidth * 1.5));
          const top = Math.floor(row * (watermarkHeight * 1.5));
          if (left >= 0 && top >= 0 && left + maxWatermarkWidth <= finalWidth && top + watermarkHeight <= finalHeight) {
            composites.push({
              input: watermarkBuffer,
              left,
              top,
              blend: "overlay",
              opacity: 0.3,
            });
          }
        }
      }

      // Aplicar marca d'água se houver posições válidas
      let outputBuffer;
      if (composites.length > 0) {
        outputBuffer = await sharp(resizedBuffer)
          .composite(composites)
          .webp({ quality: WEBP_QUALITY_IMAGE })
          .toBuffer();
        console.log("Watermark applied successfully");
      } else {
        outputBuffer = await sharp(resizedBuffer)
          .webp({ quality: WEBP_QUALITY_IMAGE })
          .toBuffer();
        console.log("No valid watermark positions, processed without watermark");
      }

      return outputBuffer;
    } catch (error) {
      console.error("Error applying soft watermark:", error);
      // Fallback: apenas redimensiona e converte para WebP
      const resizedBuffer = await this.resizeImage(imageBuffer, { height: HEIGHT_IMAGE });
      return await this.convertToWebP(resizedBuffer, WEBP_QUALITY_IMAGE);
    }
  }

  /**
   * Aplica marca d'água completa (para previews)
   */
  static async applyFullWatermark(imageBuffer) {
    try {
      const watermarkPath = path.resolve(__dirname, "../assets/watermark.png");

      // Redimensionar imagem original
      const resizedImageBuffer = await this.resizeImage(imageBuffer, { width: PREVIEW_WIDTH });

      const resizedImage = sharp(resizedImageBuffer);
      const { width: imgW, height: imgH } = await resizedImage.metadata();

      // Redimensionar marca d'água para cobrir tudo
      const watermark = await sharp(watermarkPath)
        .resize({
          width: imgW,
          height: imgH,
          fit: "cover",
        })
        .png()
        .toBuffer();

      // Aplicar marca d'água com opacidade
      const finalBuffer = await resizedImage
        .composite([
          {
            input: watermark,
            blend: "over",
            opacity: OPACITY_WATERMARK,
          },
        ])
        .toBuffer();

      // Converte para WebP
      return await this.convertToWebP(finalBuffer, 80);
    } catch (error) {
      console.error("Error applying full watermark:", error);
      // Fallback: apenas redimensiona e converte para WebP
      const resizedBuffer = await this.resizeImage(imageBuffer, { width: PREVIEW_WIDTH });
      return await this.convertToWebP(resizedBuffer, 80);
    }
  }

  /**
   * Processa thumbnail com marca d'água suave
   */
  static async processThumbnail(imageBuffer) {
    try {
      // Obter paths do ambiente
      const envPaths = this.getEnvironmentPaths();

      const processedBuffer = await this.applySoftWatermark(imageBuffer);
      const fileName = `${envPaths.thumbs}/${crypto.randomBytes(16).toString("hex")}-${Date.now()}.webp`;

      const url = await this.uploadToS3(fileName, processedBuffer, "image/webp");
      return { url, fileName };
    } catch (error) {
      console.error("Error processing thumbnail:", error);
      throw error;
    }
  }

  /**
   * Processa preview com marca d'água completa
   * @param {Buffer|Object} input - Buffer da imagem OU objeto { png: Buffer, jpg: Buffer }
   * @param {Object} options - Opções de processamento
   * @returns {Object} - { url, fileName, selectedFormat?, analysis? }
   */
  static async processPreview(input, options = {}) {
    try {
      // Obter paths do ambiente
      const envPaths = this.getEnvironmentPaths();
      let processedBuffer;
      let selectedFormat = 'WEBP'; // Formato padrão de saída
      let analysis = null;
      let fileName;

      // Verificar se input é um objeto com PNG e JPG para análise
      if (input && typeof input === 'object' && input.png && input.jpg) {
        console.log('🔄 Processando preview com análise de transparência PNG/JPG');
        
        // Executar análise e seleção de formato
        const selectionResult = await this.analyzeAndSelectFormat(input);
        
        // Usar o buffer selecionado para o preview
        processedBuffer = await this.applyFullWatermark(selectionResult.previewBuffer);
        selectedFormat = selectionResult.selectedFormat;
        analysis = selectionResult.analysis;
        
        // Gerar nome do arquivo baseado no formato selecionado
        const formatExt = selectedFormat.toLowerCase() === 'png' ? 'png' : 'jpg';
        fileName = `${envPaths.previews}/${crypto.randomBytes(16).toString("hex")}-${Date.now()}-${formatExt}.webp`;
        
        console.log('✅ Preview processado com formato selecionado:', selectedFormat);
      } 
      // Processamento tradicional com um único buffer
      else if (Buffer.isBuffer(input)) {
        console.log('🔄 Processando preview tradicional (buffer único)');
        processedBuffer = await this.applyFullWatermark(input);
        fileName = `${envPaths.previews}/${crypto.randomBytes(16).toString("hex")}-${Date.now()}.webp`;
      } 
      else {
        throw new Error('Input inválido: deve ser um Buffer ou objeto { png: Buffer, jpg: Buffer }');
      }

      const url = await this.uploadToS3(fileName, processedBuffer, "image/webp");
      
      const result = { url, fileName };
      
      // Adicionar informações da análise se disponível
      if (analysis) {
        result.selectedFormat = selectedFormat;
        result.analysis = analysis;
      }
      
      return result;
    } catch (error) {
      console.error("Error processing preview:", error);
      throw error;
    }
  }

  /**
   * Analisa transparência específica para JPG
   * JPG não tem canal alpha nativo, mas pode ter "fundo transparente" se editado
   * @param {Buffer} imageBuffer - Buffer da imagem JPG
   * @returns {Object} - { hasTransparentBackground: boolean, backgroundType: string }
   */
  static async analyzeJPGTransparency(imageBuffer) {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      // JPG tem apenas 3 canais: RGB (Red, Green, Blue)
      if (metadata.channels === 3) {
        // JPG NÃO pode ter transparência real
        // Mas pode ter "fundo transparente" se for editado com fundo uniforme
        const { data } = await image.raw().toBuffer({ resolveWithObject: true });
        
        // Analisa bordas para detectar fundo uniforme/transparente simulado
        const width = metadata.width;
        const height = metadata.height;
        const borderSamples = [];

        // Coleta amostras das bordas (primeiras e últimas linhas/colunas)
        for (let x = 0; x < width; x++) {
          // Primeira linha
          const topIndex = x * 3;
          borderSamples.push([data[topIndex], data[topIndex + 1], data[topIndex + 2]]);
          
          // Última linha
          const bottomIndex = ((height - 1) * width + x) * 3;
          borderSamples.push([data[bottomIndex], data[bottomIndex + 1], data[bottomIndex + 2]]);
        }

        for (let y = 0; y < height; y++) {
          // Primeira coluna
          const leftIndex = (y * width) * 3;
          borderSamples.push([data[leftIndex], data[leftIndex + 1], data[leftIndex + 2]]);
          
          // Última coluna
          const rightIndex = (y * width + width - 1) * 3;
          borderSamples.push([data[rightIndex], data[rightIndex + 1], data[rightIndex + 2]]);
        }

        // Verifica se as bordas são predominantemente brancas/uniformes
        let whiteSamples = 0;
        let uniformSamples = 0;
        
        borderSamples.forEach(([r, g, b]) => {
          // Considera branco se RGB > 240
          if (r > 240 && g > 240 && b > 240) {
            whiteSamples++;
          }
          // Considera uniforme se a diferença entre RGB é pequena
          if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10) {
            uniformSamples++;
          }
        });

        const whitePercentage = (whiteSamples / borderSamples.length) * 100;
        const uniformPercentage = (uniformSamples / borderSamples.length) * 100;

        // Considera "transparente" se bordas são 70% brancas ou 80% uniformes
        const hasTransparentBackground = whitePercentage > 70 || uniformPercentage > 80;

        return {
          hasTransparentBackground,
          backgroundType: hasTransparentBackground ? 'uniform' : 'complex',
          whitePercentage,
          uniformPercentage
        };
      }

      return {
        hasTransparentBackground: false,
        backgroundType: 'invalid_format',
        whitePercentage: 0,
        uniformPercentage: 0
      };

    } catch (error) {
      console.error('Erro ao analisar JPG:', error);
      return {
        hasTransparentBackground: false,
        backgroundType: 'error',
        whitePercentage: 0,
        uniformPercentage: 0
      };
    }
  }

  /**
   * Analisa transparência específica para PNG
   * PNG tem canal alpha nativo (RGBA)
   * @param {Buffer} imageBuffer - Buffer da imagem PNG
   * @returns {Object} - { hasAlpha: boolean, alphaPercentage: number, isTransparent: boolean }
   */
  static async analyzePNGTransparency(imageBuffer) {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      // PNG tem canal alpha nativo (RGBA)
      if (metadata.channels === 4 && metadata.hasAlpha) {
        // Analisa cada pixel: RGBA (Red, Green, Blue, Alpha)
        // Alpha = 0 = totalmente transparente
        // Alpha = 255 = totalmente opaco
        const { data } = await image.raw().toBuffer({ resolveWithObject: true });

        let transparentPixels = 0;
        let totalPixels = metadata.width * metadata.height;

        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 128) { // Alpha < 128 = transparente
            transparentPixels++;
          }
        }

        const alphaPercentage = (transparentPixels / totalPixels) * 100;

        return {
          hasAlpha: true,
          alphaPercentage: alphaPercentage,
          isTransparent: alphaPercentage > 15 // Mais de 15% transparente
        };
      }

      // PNG sem transparência ou formato inválido
      return {
        hasAlpha: false,
        alphaPercentage: 0,
        isTransparent: false
      };

    } catch (error) {
      console.error('Erro ao analisar PNG:', error);
      return {
        hasAlpha: false,
        alphaPercentage: 0,
        isTransparent: false
      };
    }
  }

  /**
   * Analisa se uma imagem tem fundo transparente (canal alpha) de forma robusta
   * @param {Buffer} imageBuffer - Buffer da imagem
   * @returns {Object} - { hasAlpha: boolean, alphaPercentage: number, isTransparent: boolean }
   */
  static async analyzeImageAlpha(imageBuffer) {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      // Verificar se tem canal alpha
      if (metadata.channels === 4 && metadata.hasAlpha) {
        // PNG com transparência - analisar pixels para determinar se é realmente transparente
        const { data } = await image.raw().toBuffer({ resolveWithObject: true });

        let transparentPixels = 0;
        let totalPixels = metadata.width * metadata.height;

        // Verificar cada pixel (cada 4 valores = RGBA)
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 128) { // Alpha < 128 = transparente
            transparentPixels++;
          }
        }

        const alphaPercentage = (transparentPixels / totalPixels) * 100;

        return {
          hasAlpha: true,
          alphaPercentage: alphaPercentage,
          isTransparent: alphaPercentage > 15 // Mais de 15% transparente
        };
      }

      // JPG, GIF sem alpha, ou PNG sem transparência
      return {
        hasAlpha: false,
        alphaPercentage: 0,
        isTransparent: false
      };

    } catch (error) {
      console.error('Erro ao analisar canal alpha:', error);
      // Em caso de erro, retorna valores seguros
      return {
        hasAlpha: false,
        alphaPercentage: 0,
        isTransparent: false
      };
    }
  }

  /**
   * Detecta o formato real da imagem baseado nos metadados
   */
  static async detectImageFormat(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();

      // Mapear formatos baseado no formato interno do Sharp
      const formatMap = {
        'jpeg': 'JPG',
        'jpg': 'JPG',
        'png': 'PNG',
        'webp': 'WEBP',
        'gif': 'GIF',
        'svg': 'SVG',
        'tiff': 'TIFF',
        'avif': 'AVIF'
      };

      const detectedFormat = formatMap[metadata.format] || metadata.format?.toUpperCase() || 'UNKNOWN';

      return {
        format: detectedFormat,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
        isOpaque: metadata.isOpaque
      };
    } catch (error) {
      console.error("Error detecting image format:", error);
      throw error;
    }
  }

  /**
   * Implementa a lógica de seleção de formato de preview baseada na transparência
   * Regras:
   * - Sempre começar checando JPG primeiro
   * - Cenário 1: PNG (fundo sólido) + JPG (fundo transparente) = JPG como PREVIEW
   * - Cenário 2: PNG (fundo transparente) + JPG (fundo sólido) = PNG como PREVIEW  
   * @param {Buffer} pngBuffer - Buffer da imagem PNG
   * @param {Buffer} jpgBuffer - Buffer da imagem JPG
   * @returns {Object} - { selectedFormat: 'PNG'|'JPG', previewBuffer: Buffer, contentBuffer: Buffer, analysis: Object }
   */
  static async selectPreviewFormat(pngBuffer, jpgBuffer) {
    try {
      console.log('🔍 Iniciando análise de transparência - sempre começar com JPG');
      
      // OBS: sempre começar a checagem do fundo transparente do JPG para depois ir para o PNG
      const jpgAnalysis = await this.analyzeJPGTransparency(jpgBuffer);
      console.log('📊 Análise JPG:', jpgAnalysis);
      
      const pngAnalysis = await this.analyzePNGTransparency(pngBuffer);
      console.log('📊 Análise PNG:', pngAnalysis);

      let selectedFormat;
      let previewBuffer;
      let contentBuffer;
      let scenario;

      // Cenário 1: PNG (fundo branco/sólido ❌) + JPG (fundo transparente ✅) 
      // Resultado: JPG como PREVIEW, PNG como CONTEÚDO
      // Formato: JPG
      if (!pngAnalysis.isTransparent && jpgAnalysis.hasTransparentBackground) {
        scenario = 'Cenário 1: PNG fundo sólido + JPG fundo transparente';
        selectedFormat = 'JPG';
        previewBuffer = jpgBuffer;  // JPG como PREVIEW
        contentBuffer = pngBuffer;  // PNG como CONTEÚDO
        console.log('✅ ' + scenario);
        console.log('📋 Resultado: JPG como PREVIEW, PNG como CONTEÚDO, Formato: JPG');
      }
      // Cenário 2: PNG (fundo transparente ✅) + JPG (fundo branco/sólido ❌)
      // Resultado: PNG como PREVIEW, JPG como CONTEÚDO  
      // Formato: PNG
      else if (pngAnalysis.isTransparent && !jpgAnalysis.hasTransparentBackground) {
        scenario = 'Cenário 2: PNG fundo transparente + JPG fundo sólido';
        selectedFormat = 'PNG';
        previewBuffer = pngBuffer;  // PNG como PREVIEW
        contentBuffer = jpgBuffer;  // JPG como CONTEÚDO
        console.log('✅ ' + scenario);
        console.log('📋 Resultado: PNG como PREVIEW, JPG como CONTEÚDO, Formato: PNG');
      }
      // Caso padrão: usar PNG se ambos transparentes ou JPG se ambos sólidos
      else if (pngAnalysis.isTransparent && jpgAnalysis.hasTransparentBackground) {
        scenario = 'Ambos com fundo transparente - preferir PNG';
        selectedFormat = 'PNG';
        previewBuffer = pngBuffer;
        contentBuffer = jpgBuffer;
        console.log('🔄 ' + scenario);
      }
      else {
        scenario = 'Ambos com fundo sólido - preferir JPG';
        selectedFormat = 'JPG';
        previewBuffer = jpgBuffer;
        contentBuffer = pngBuffer;
        console.log('🔄 ' + scenario);
      }

      return {
        selectedFormat,
        previewBuffer,
        contentBuffer,
        scenario,
        analysis: {
          png: pngAnalysis,
          jpg: jpgAnalysis
        }
      };

    } catch (error) {
      console.error('❌ Erro na seleção de formato:', error);
      // Fallback: usar PNG como padrão
      return {
        selectedFormat: 'PNG',
        previewBuffer: pngBuffer,
        contentBuffer: jpgBuffer,
        scenario: 'Erro - fallback para PNG',
        analysis: {
          error: error.message
        }
      };
    }
  }

  /**
   * Processo completo de análise e seleção de formato para duas imagens
   * @param {Object} files - { png: Buffer, jpg: Buffer }
   * @returns {Object} - Resultado da análise e seleção
   */
  static async analyzeAndSelectFormat(files) {
    try {
      if (!files.png || !files.jpg) {
        throw new Error('É necessário fornecer tanto PNG quanto JPG para análise');
      }

      console.log('🚀 Iniciando processo de análise e seleção de formato');
      
      // Detectar formatos para validação
      const pngFormat = await this.detectImageFormat(files.png);
      const jpgFormat = await this.detectImageFormat(files.jpg);
      
      console.log('📷 Formatos detectados:', { 
        png: pngFormat.format, 
        jpg: jpgFormat.format 
      });

      // Verificar se os formatos estão corretos
      if (pngFormat.format !== 'PNG') {
        console.warn('⚠️ Arquivo PNG não está no formato esperado:', pngFormat.format);
      }
      
      if (jpgFormat.format !== 'JPG') {
        console.warn('⚠️ Arquivo JPG não está no formato esperado:', jpgFormat.format);
      }

      // Executar seleção de formato
      const result = await this.selectPreviewFormat(files.png, files.jpg);
      
      console.log('🎯 Seleção finalizada:', {
        formato: result.selectedFormat,
        cenário: result.scenario
      });

      return {
        ...result,
        metadata: {
          png: pngFormat,
          jpg: jpgFormat
        }
      };

    } catch (error) {
      console.error('❌ Erro no processo de análise:', error);
      throw error;
    }
  }

  /**
   * Gera nome de arquivo único para S3
   */
  static generateFileName(originalName, folder, extension = '') {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(16).toString("hex");
    const ext = extension || path.extname(originalName);

    return `${folder}/${randomHash}-${timestamp}${ext}`;
  }
}

module.exports = ImageProcessor;
