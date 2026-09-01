const fs = require("fs");
const path = require("path");

/**
 * Gravação em disco para a cópia LOCAL do upload (dev).
 * Não é usado pelo fluxo S3 de produção.
 */
class LocalObjectStore {
  static getUploadsRoot() {
    return path.resolve(__dirname, "..", "..", "uploads");
  }

  static getPublicBaseUrl() {
    if (process.env.LOCAL_STORAGE_PUBLIC_URL) {
      return process.env.LOCAL_STORAGE_PUBLIC_URL.replace(/\/$/, "");
    }
    const port = process.env.NODE_PORT || 3000;
    return `http://localhost:${port}`;
  }

  static publicUrlForKey(key) {
    const normalized = String(key).replace(/^\/+/, "");
    return `${this.getPublicBaseUrl()}/uploads/${normalized}`;
  }

  /**
   * @param {{ key: string, body: Buffer|import('stream').Readable, contentType?: string }} opts
   * @returns {Promise<{ url: string, key: string }>}
   */
  static async putObject({ key, body }) {
    const normalizedKey = String(key).replace(/^\/+/, "");
    const dest = path.join(this.getUploadsRoot(), normalizedKey);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });

    if (Buffer.isBuffer(body)) {
      await fs.promises.writeFile(dest, body);
    } else if (body && typeof body.pipe === "function") {
      await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(dest);
        body.pipe(out);
        out.on("finish", resolve);
        out.on("error", reject);
        body.on("error", reject);
      });
    } else if (typeof body === "string") {
      await fs.promises.copyFile(body, dest);
    } else {
      throw new Error("Unsupported body type for local object store");
    }

    console.log(`📁 [upload:local] saved ${normalizedKey}`);
    return { url: this.publicUrlForKey(normalizedKey), key: normalizedKey };
  }

  static async deleteByUrl(photoUrl) {
    let key;
    try {
      const url = new URL(photoUrl);
      const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
      key = pathname.startsWith("uploads/") ? pathname.slice("uploads/".length) : pathname;
    } catch {
      return;
    }
    const dest = path.join(this.getUploadsRoot(), key);
    if (fs.existsSync(dest)) {
      await fs.promises.unlink(dest);
    }
  }
}

module.exports = LocalObjectStore;
