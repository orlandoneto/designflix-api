const { UserMainGrid, UserMainGridCategories, UserMainGridTags, Category, Tags } = require("../models");

/**
 * Serviço para integrar upload unificado com UserMainGrid
 */
class UnifiedUploadIntegrationService {

  /**
   * Cria ou encontra uma categoria
   */
  async findOrCreateCategory(categoryName) {
    try {
      if (!categoryName || !categoryName.trim()) {
        return null;
      }

      const [category] = await Category.findOrCreate({
        where: { name: categoryName.trim() },
        defaults: { active: 1 }
      });

      return category;
    } catch (error) {
      console.error("Error finding/creating category:", error);
      return null;
    }
  }

  /**
   * Cria ou encontra tags
   */
  async findOrCreateTags(tagNames) {
    try {
      if (!Array.isArray(tagNames) || tagNames.length === 0) {
        return [];
      }

      const tags = [];

      for (const tagName of tagNames) {
        if (tagName && tagName.trim()) {
          const [tag] = await Tags.findOrCreate({
            where: { name: tagName.trim() }
          });
          tags.push(tag);
        }
      }

      return tags;
    } catch (error) {
      console.error("Error finding/creating tags:", error);
      return [];
    }
  }

  /**
 * Salva dados no UserMainGrid
 */
  async saveToUserMainGrid(data, userId, adminId = null) {
    try {
      console.log("Saving to UserMainGrid:", {
        name: data.name,
        format: data.format,
        user_id: userId,
        admin_id: adminId,
        url_thumb: data.url_thumb,
        url_cover: data.url_cover,
        url: data.url
      });

      // Criar registro principal
      const userMainGrid = await UserMainGrid.create({
        admin_id: adminId,
        user_id: userId, // Sempre salva o user_id
        name: data.name,
        format: data.format,
        url_thumb: data.url_thumb,
        url_cover: data.url_cover,
        url: data.url,
        favorite: 0,
        follow_design: 0,
        count_download: 0,
        terms: data.terms,
        activite: true
      });

      console.log("UserMainGrid created with ID:", userMainGrid.id);

      // Processar categoria se fornecida
      if (data.categoryId || data.categoryName) {
        let category = null;

        if (data.categoryId) {
          category = await Category.findByPk(data.categoryId);
        } else if (data.categoryName) {
          category = await this.findOrCreateCategory(data.categoryName);
        }

        if (category) {
          await UserMainGridCategories.create({
            user_main_grid_id: userMainGrid.id,
            category_id: category.id
          });

          console.log("Category linked:", category.name);
        }
      }

      // Processar tags
      if (data.tags && data.tags.length > 0) {
        const tags = await this.findOrCreateTags(data.tags);

        for (const tag of tags) {
          await UserMainGridTags.create({
            user_main_grid_id: userMainGrid.id,
            tag_id: tag.id
          });
        }

        console.log("Tags linked:", tags.length);
      }

      // Buscar registro completo com relacionamentos
      const completeRecord = await UserMainGrid.findOne({
        where: { id: userMainGrid.id },
        include: [
          {
            model: UserMainGridCategories,
            as: "user_main_grid_categories",
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "name", "active"],
              },
            ],
          },
          {
            model: UserMainGridTags,
            as: "user_main_grid_tags",
            include: [
              {
                model: Tags,
                as: "tag",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      });

      return completeRecord;

    } catch (error) {
      console.error("Error saving to UserMainGrid:", error);
      throw error;
    }
  }

  /**
   * Processa resultado do upload unificado e salva no banco
   */
  async processAndSave(uploadResult, userId, adminId = null) {
    try {
      console.log("Processing upload result for user:", userId);

      // Se for upload único
      if (uploadResult.data && !uploadResult.data.success) {
        return await this.saveToUserMainGrid(uploadResult.data, userId, adminId);
      }

      // Se for upload múltiplo
      if (uploadResult.data && uploadResult.data.success) {
        const results = [];

        for (const item of uploadResult.data.success) {
          try {
            const savedRecord = await this.saveToUserMainGrid(
              item.result,
              userId,
              adminId
            );

            results.push({
              index: item.index,
              originalName: item.originalName,
              savedRecord: savedRecord
            });

          } catch (error) {
            console.error(`Error saving item ${item.index}:`, error);
            results.push({
              index: item.index,
              originalName: item.originalName,
              error: error.message
            });
          }
        }

        return {
          totalProcessed: results.length,
          success: results.filter(r => r.savedRecord),
          errors: results.filter(r => r.error)
        };
      }

      throw new Error("Invalid upload result format");

    } catch (error) {
      console.error("Error processing and saving upload result:", error);
      throw error;
    }
  }

  /**
   * Atualiza registro existente no UserMainGrid
   */
  async updateUserMainGrid(id, data, userId, adminId = null) {
    try {
      console.log("Updating UserMainGrid ID:", id);

      // Verificar se o usuário tem permissão
      const existingRecord = await UserMainGrid.findOne({
        where: { id: id }
      });

      if (!existingRecord) {
        throw new Error("Record not found");
      }

      if (existingRecord.user_id !== userId && !adminId) {
        throw new Error("Unauthorized to update this record");
      }

      // Atualizar dados principais
      const updateData = {
        name: data.name || existingRecord.name,
        format: data.format || existingRecord.format,
        url_thumb: data.url_thumb || existingRecord.url_thumb,
        url_cover: data.url_cover || existingRecord.url_cover,
        url: data.url || existingRecord.url,
        terms: data.terms || existingRecord.terms
      };

      await UserMainGrid.update(updateData, { where: { id: id } });

      // Atualizar categoria se fornecida
      if (data.categoryId || data.categoryName) {
        // Remover categorias existentes
        await UserMainGridCategories.destroy({
          where: { user_main_grid_id: id }
        });

        // Adicionar nova categoria
        let category = null;
        if (data.categoryId) {
          category = await Category.findByPk(data.categoryId);
        } else if (data.categoryName) {
          category = await this.findOrCreateCategory(data.categoryName);
        }

        if (category) {
          await UserMainGridCategories.create({
            user_main_grid_id: id,
            category_id: category.id
          });
        }
      }

      // Atualizar tags se fornecidas
      if (data.tags && Array.isArray(data.tags)) {
        // Remover tags existentes
        await UserMainGridTags.destroy({
          where: { user_main_grid_id: id }
        });

        // Adicionar novas tags
        const tags = await this.findOrCreateTags(data.tags);
        for (const tag of tags) {
          await UserMainGridTags.create({
            user_main_grid_id: id,
            tag_id: tag.id
          });
        }
      }

      // Buscar registro atualizado
      const updatedRecord = await UserMainGrid.findOne({
        where: { id: id },
        include: [
          {
            model: UserMainGridCategories,
            as: "user_main_grid_categories",
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "name", "active"],
              },
            ],
          },
          {
            model: UserMainGridTags,
            as: "user_main_grid_tags",
            include: [
              {
                model: Tags,
                as: "tag",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      });

      return updatedRecord;

    } catch (error) {
      console.error("Error updating UserMainGrid:", error);
      throw error;
    }
  }
}

module.exports = UnifiedUploadIntegrationService;
