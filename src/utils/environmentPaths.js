const {
  FOLDER_NAME_THUMBS_PATH,
  FOLDER_IMAGE_PREVIEWS_PATH,
  FOLDER_NAME_THUMBS_PATH_TEST,
  FOLDER_IMAGE_PREVIEWS_PATH_TEST,
  FOLDER_IMAGES_PROFILE,
  FOLDER_IMAGES_PROFILE_TEST,
  FOLDER_NAME_IMAGES_PATH,
  FOLDER_NAME_IMAGES_PATH_TEST
} = require("./constants/constants");

/**
 * Utilitário centralizado para detectar paths do ambiente S3
 */
class EnvironmentPaths {

  /**
   * Detecta o ambiente atual
   */
  static getCurrentEnvironment() {
    return process.env.NODE_ENV || 'development';
  }

  /**
   * Retorna todos os paths para o ambiente atual
   */
  static getAllPaths() {
    const env = this.getCurrentEnvironment();

    if (env === 'test' || env === 'development') {
      console.log(`🔧 Using TEST/DEV paths for environment: ${env}`);
      return {
        thumbs: FOLDER_NAME_THUMBS_PATH_TEST,
        previews: FOLDER_IMAGE_PREVIEWS_PATH_TEST,
        profile: FOLDER_IMAGES_PROFILE_TEST,
        downloads: FOLDER_NAME_IMAGES_PATH_TEST
      };
    } else {
      console.log(`🚀 Using PRODUCTION paths for environment: ${env}`);
      return {
        thumbs: FOLDER_NAME_THUMBS_PATH,
        previews: FOLDER_IMAGE_PREVIEWS_PATH,
        profile: FOLDER_IMAGES_PROFILE,
        downloads: FOLDER_NAME_IMAGES_PATH
      };
    }
  }

  /**
   * Retorna path específico para thumbnails
   */
  static getThumbsPath() {
    const env = this.getCurrentEnvironment();
    return env === 'test' || env === 'development'
      ? FOLDER_NAME_THUMBS_PATH_TEST
      : FOLDER_NAME_THUMBS_PATH;
  }

  /**
   * Retorna path específico para previews
   */
  static getPreviewsPath() {
    const env = this.getCurrentEnvironment();
    return env === 'test' || env === 'development'
      ? FOLDER_IMAGE_PREVIEWS_PATH_TEST
      : FOLDER_IMAGE_PREVIEWS_PATH;
  }

  /**
   * Retorna path específico para profile
   */
  static getProfilePath() {
    const env = this.getCurrentEnvironment();
    return env === 'test' || env === 'development'
      ? FOLDER_IMAGES_PROFILE_TEST
      : FOLDER_IMAGES_PROFILE;
  }

  /**
   * Retorna path específico para downloads
   */
  static getDownloadsPath() {
    const env = this.getCurrentEnvironment();
    return env === 'test' || env === 'development'
      ? FOLDER_NAME_IMAGES_PATH_TEST
      : FOLDER_NAME_IMAGES_PATH;
  }

  /**
   * Verifica se está em ambiente de desenvolvimento/teste
   */
  static isDevelopmentOrTest() {
    const env = this.getCurrentEnvironment();
    return env === 'test' || env === 'development';
  }

  /**
   * Verifica se está em produção
   */
  static isProduction() {
    const env = this.getCurrentEnvironment();
    return env === 'production';
  }
}

module.exports = EnvironmentPaths;
