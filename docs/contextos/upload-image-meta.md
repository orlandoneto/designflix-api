# Contexto: Metadados de imagem no upload

No pipeline `/unified-upload` (coração do produto), persistimos metadados **simples** do preview via Sharp — **sem OCR**.

| Item | Caminho |
|------|---------|
| Detecção | `ImageProcessor.detectImageFormat` (`sharp().metadata()`) |
| Normalização | `src/services/upload/upload-image-meta.js` |
| Persistência | `UnifiedUploadIntegrationService.saveToUserMainGrid` |
| Colunas | `user_main_grid.width`, `.height`, `.file_size` |
| Migration | `migrations/20260907120000-user-main-grid-image-meta.js` |
| Exposição catálogo | `mapGridItemFields` → listagem/detalhe |

**Última revisão:** set/2026.

---

## Campos

| Campo | Origem | Notas |
|-------|--------|--------|
| `format` | extensão do **conteúdo** (PSD/ZIP interno, etc.) | já existia |
| `width` / `height` | Sharp no **preview** | null se falhar |
| `file_size` | bytes do **conteúdo**; senão do preview | null se falhar |

Falha de metadata → **log + null**; o upload **não** é abortado.

## Fora de escopo

- OCR / leitura de texto na imagem  
- EXIF completo (câmera, GPS)  

## Ops

```bash
npx sequelize-cli db:migrate
# ou
npm run migrate:development
```
