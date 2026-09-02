const { logRedis, logRedisConnection } = require("../config/testingLogs");

/**
 * Utilitários para Cache Redis
 * Funções reutilizáveis para gerenciar cache em toda a aplicação
 */

class RedisCache {
  /**
   * Verifica se o Redis está habilitado para o ambiente atual
   * @returns {boolean} True se o Redis estiver habilitado
   */
  static isRedisEnabled() {
    const env = process.env.NODE_ENV || 'development';
    const disableRedisDev = process.env.DISABLE_REDIS_DEV === 'true';

    // Em desenvolvimento, verifica se deve desabilitar
    if (env === 'development' && disableRedisDev) {
      return false;
    }

    return true;
  }

  /**
   * Gera chave única para o cache.
   * Preferir objeto de filtros: generateCacheKey('catalog', { q, format, categoryId, page, limit })
   * Assinatura legada (posicional) ainda suportada.
   */
  static generateCacheKey(entity, searchTermOrParams, format, page, limit) {
    const env = process.env.NODE_ENV || 'development';
    const entityName = env === 'development' ? `${entity}_dev` : entity;

    if (searchTermOrParams && typeof searchTermOrParams === 'object' && !Array.isArray(searchTermOrParams)) {
      const p = searchTermOrParams;
      return [
        entityName,
        p.q || p.searchTerm || 'null',
        p.format || 'null',
        p.categoryId || p.category || p.categorySlug || 'null',
        p.availability || 'null',
        p.sort || 'null',
        p.page || 1,
        p.limit || 40,
      ].join(':');
    }

    return `${entityName}:${searchTermOrParams || 'null'}:${format || 'null'}:${page}:${limit}`;
  }

  /**
   * Busca dados no cache Redis com timeout de segurança
   * @param {Object} redis - Cliente Redis
   * @param {string} cacheKey - Chave do cache
   * @param {number} timeout - Timeout em ms (padrão: 100ms)
   * @returns {Object|null} Dados do cache ou null se não encontrado
   */
  static async getFromCache(redis, cacheKey, timeout = 100) {
    // Verifica se o Redis está habilitado
    if (!this.isRedisEnabled()) {
      logRedis('Redis desabilitado para este ambiente, consultando banco diretamente...');
      return null;
    }

    if (!redis || redis.status !== 'ready') {
      logRedisConnection('Redis não está disponível, consultando banco diretamente...');
      if (redis) {
        logRedisConnection('Status atual do Redis:', redis.status);
      }
      return null;
    }

    try {
      console.log('✅ Redis está pronto, buscando dados...');
      const cachedData = await Promise.race([
        redis.get(cacheKey),
        new Promise(resolve => setTimeout(() => resolve(null), timeout))
      ]);

      if (cachedData) {
        logRedis('CACHE HIT! Dados encontrados no Redis para chave:', cacheKey);
        return JSON.parse(cachedData);
      } else {
        logRedis('CACHE MISS! Dados não encontrados no Redis para chave:', cacheKey);
        return null;
      }
    } catch (cacheError) {
      console.log('⚠️ Erro ao buscar cache Redis:', cacheError.message);
      console.log('🔄 Continuando com consulta normal no banco...');
      return null;
    }
  }

  /**
   * Salva dados no cache Redis de forma assíncrona
   * @param {Object} redis - Cliente Redis
   * @param {string} cacheKey - Chave do cache
   * @param {Object} data - Dados para salvar
   * @param {number} ttl - Tempo de vida em segundos (padrão: 300s = 5min)
   */
  static saveToCache(redis, cacheKey, data, ttl = 300) {
    // Verifica se o Redis está habilitado
    if (!this.isRedisEnabled()) {
      logRedis('Redis desabilitado para este ambiente, ignorando salvamento no cache...');
      return;
    }

    if (!redis || redis.status !== 'ready') {
      return;
    }

    try {
      // Salva em background sem bloquear a resposta
      redis.setex(cacheKey, ttl, JSON.stringify(data)).catch(err => {
        console.log('⚠️ Erro ao salvar cache Redis (não crítico):', err.message);
      });
      logRedis('Dados sendo salvos no cache Redis (assíncrono):', cacheKey);
    } catch (cacheError) {
      console.log('⚠️ Erro ao salvar cache Redis');
    }
  }

  /**
   * Remove chave específica do cache
   * @param {Object} redis - Cliente Redis
   * @param {string} cacheKey - Chave do cache
   */
  static async removeFromCache(redis, cacheKey) {
    // Verifica se o Redis está habilitado
    if (!this.isRedisEnabled()) {
      logRedis('Redis desabilitado para este ambiente, ignorando remoção do cache...');
      return;
    }

    if (!redis || redis.status !== 'ready') {
      return;
    }

    try {
      await redis.del(cacheKey);
      logRedis('Chave removida do cache Redis:', cacheKey);
    } catch (error) {
      console.log('⚠️ Erro ao remover chave do cache Redis:', error.message);
    }
  }

  /**
   * Remove múltiplas chaves do cache por padrão
   * @param {Object} redis - Cliente Redis
   * @param {string} pattern - Padrão das chaves (ex: 'user_main_grid:*')
   */
  static async removePatternFromCache(redis, pattern) {
    // Verifica se o Redis está habilitado
    if (!this.isRedisEnabled()) {
      logRedis('Redis desabilitado para este ambiente, ignorando limpeza do cache...');
      return;
    }

    if (!redis || redis.status !== 'ready') {
      return;
    }

    try {
      const env = process.env.NODE_ENV || 'development';

      // Se o padrão não incluir o ambiente, adiciona automaticamente
      let searchPattern = pattern;
      if (!pattern.includes('_dev') && !pattern.includes('user_main_grid_dev')) {
        if (env === 'development') {
          // Em desenvolvimento, substitui user_main_grid por user_main_grid_dev
          searchPattern = pattern.replace('user_main_grid', 'user_main_grid_dev');
        }
        // Em produção mantém o padrão original
      }

      const keys = await redis.keys(searchPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logRedis(`${keys.length} chaves removidas do cache Redis com padrão:`, searchPattern);
      }
    } catch (error) {
      console.log('⚠️ Erro ao remover padrão do cache Redis:', error.message);
    }
  }

  /**
   * Verifica se o Redis está disponível
   * @param {Object} redis - Cliente Redis
   * @returns {boolean} True se Redis estiver pronto
   */
  static isRedisReady(redis) {
    return redis && redis.status === 'ready';
  }

  /**
   * Obtém informações sobre o cache (TTL, tamanho)
   * @param {Object} redis - Cliente Redis
   * @param {string} cacheKey - Chave do cache
   * @returns {Object} Informações do cache
   */
  static async getCacheInfo(redis, cacheKey) {
    if (!redis || redis.status !== 'ready') {
      return null;
    }

    try {
      const ttl = await redis.ttl(cacheKey);
      const size = await redis.strlen(cacheKey);

      return {
        key: cacheKey,
        ttl: ttl > 0 ? ttl : 'expired',
        size: size > 0 ? `${size} bytes` : 'not found'
      };
    } catch (error) {
      console.log('⚠️ Erro ao obter informações do cache:', error.message);
      return null;
    }
  }
}

module.exports = RedisCache;
