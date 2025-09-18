/**
 * Exemplo de uso avançado do BotDetectionMiddleware
 * 
 * Este arquivo mostra como usar o middleware para servir conteúdo
 * dinâmico baseado em dados reais do banco de dados.
 */

const BotDetectionMiddleware = require('./botDetection');
const { UserMainGrid, Category, User } = require('../models');

class AdvancedBotDetection extends BotDetectionMiddleware {
  constructor() {
    super();
  }

  /**
   * Gera HTML para página inicial com dados dinâmicos
   */
  async generateHomePageHTML() {
    try {
      // Buscar dados reais do banco
      const [totalTemplates, totalCategories, totalContributors] = await Promise.all([
        UserMainGrid.count({ where: { activite: 0 } }),
        Category.count({ where: { active: 1 } }),
        User.count({ where: { contributor: 1, acceptTerms: 1 } })
      ]);

      const pageData = {
        title: 'FlixDesign - Design Resources Premium',
        description: `Mais de ${totalTemplates} templates premium, ${totalCategories} categorias e ${totalContributors} contribuidores talentosos. Descubra os melhores recursos de design para seus projetos.`,
        image: '/logo.png',
        url: process.env.FRONTEND_URL || 'https://flixdesign.com'
      };

      return this.generateBotHTML(pageData);
    } catch (error) {
      console.error('Erro ao gerar HTML da página inicial:', error);
      return this.generateBotHTML(); // Fallback para dados padrão
    }
  }

  /**
   * Gera HTML para categoria específica
   */
  async generateCategoryHTML(categoryId) {
    try {
      const category = await Category.findOne({
        where: { id: categoryId, active: 1 },
        include: [{
          model: UserMainGrid,
          as: 'user_main_grids',
          where: { activite: 0 },
          required: false,
          attributes: []
        }]
      });

      if (!category) {
        return this.generateBotHTML({
          title: 'Categoria não encontrada - FlixDesign',
          description: 'A categoria solicitada não foi encontrada.',
          image: '/logo.png'
        });
      }

      const templateCount = category.user_main_grids ? category.user_main_grids.length : 0;

      const pageData = {
        title: `${category.name} - Templates Premium - FlixDesign`,
        description: `Explore ${templateCount} templates premium na categoria ${category.name}. Designs profissionais e modernos para ${category.name.toLowerCase()}.`,
        image: '/logo.png',
        url: `${process.env.FRONTEND_URL || 'https://flixdesign.com'}/category/${categoryId}`
      };

      return this.generateBotHTML(pageData);
    } catch (error) {
      console.error('Erro ao gerar HTML da categoria:', error);
      return this.generateBotHTML();
    }
  }

  /**
   * Gera HTML para contribuidor específico
   */
  async generateContributorHTML(userId) {
    try {
      const user = await User.findOne({
        where: { id: userId, contributor: 1 },
        include: [{
          model: UserMainGrid,
          as: 'user_main_grids',
          where: { activite: 0 },
          required: false,
          attributes: []
        }]
      });

      if (!user) {
        return this.generateBotHTML({
          title: 'Contribuidor não encontrado - FlixDesign',
          description: 'O contribuidor solicitado não foi encontrado.',
          image: '/logo.png'
        });
      }

      const templateCount = user.user_main_grids ? user.user_main_grids.length : 0;

      const pageData = {
        title: `${user.name} - Contribuidor - FlixDesign`,
        description: `Conheça ${user.name}, um de nossos talentosos contribuidores com ${templateCount} templates premium disponíveis.`,
        image: user.photo || '/logo.png',
        url: `${process.env.FRONTEND_URL || 'https://flixdesign.com'}/user/${userId}`
      };

      return this.generateBotHTML(pageData);
    } catch (error) {
      console.error('Erro ao gerar HTML do contribuidor:', error);
      return this.generateBotHTML();
    }
  }

  /**
   * Gera HTML para template específico
   */
  async generateTemplateHTML(templateId) {
    try {
      const template = await UserMainGrid.findOne({
        where: { id: templateId, activite: 0 },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'photo']
          },
          {
            model: Category,
            as: 'user_main_grid_categories',
            through: { attributes: [] },
            attributes: ['id', 'name']
          }
        ]
      });

      if (!template) {
        return this.generateBotHTML({
          title: 'Template não encontrado - FlixDesign',
          description: 'O template solicitado não foi encontrado.',
          image: '/logo.png'
        });
      }

      const categories = template.user_main_grid_categories
        ? template.user_main_grid_categories.map(cat => cat.name).join(', ')
        : 'Design';

      const pageData = {
        title: `${template.title || 'Template Premium'} - FlixDesign`,
        description: `${template.description || 'Template premium'} por ${template.user.name}. Categoria: ${categories}.`,
        image: template.image || '/logo.png',
        url: `${process.env.FRONTEND_URL || 'https://flixdesign.com'}/template/${templateId}`
      };

      return this.generateBotHTML(pageData);
    } catch (error) {
      console.error('Erro ao gerar HTML do template:', error);
      return this.generateBotHTML();
    }
  }

  /**
   * Handler dinâmico para servir HTML baseado na rota
   */
  async serveDynamicBotHTML(req, res) {
    if (!req.isBot) {
      return res.status(404).send('Not found');
    }

    let html;
    const path = req.path;

    try {
      if (path === '/') {
        html = await this.generateHomePageHTML();
      } else if (path.startsWith('/category/')) {
        const categoryId = path.split('/')[2];
        html = await this.generateCategoryHTML(categoryId);
      } else if (path.startsWith('/user/')) {
        const userId = path.split('/')[2];
        html = await this.generateContributorHTML(userId);
      } else if (path.startsWith('/template/')) {
        const templateId = path.split('/')[2];
        html = await this.generateTemplateHTML(templateId);
      } else {
        // Fallback para páginas genéricas
        html = this.generateBotHTML({
          title: 'FlixDesign - Design Resources',
          description: 'Recursos de design premium para profissionais criativos.',
          image: '/logo.png'
        });
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache por 30 minutos
      res.send(html);

    } catch (error) {
      console.error('Erro ao servir HTML dinâmico:', error);
      res.status(500).send('Erro interno do servidor');
    }
  }
}

module.exports = AdvancedBotDetection;
