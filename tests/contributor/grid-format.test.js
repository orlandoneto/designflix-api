const {
  resolveAvailabilityFromInput,
  resolveFileFormat,
  resolveAvailability,
  resolveDisplayFormat,
  mapGridItemFields,
  appendFormatFilter,
  isLegacyFreeFormat,
} = require("../../src/utils/grid-item");
const {
  resolvePersistedFormat,
} = require("../../src/services/unified-upload-integration.service");

describe("grid-item utils", () => {
  it("resolveAvailabilityFromInput normaliza free e paid", () => {
    expect(resolveAvailabilityFromInput({ availability: "free" })).toBe("free");
    expect(resolveAvailabilityFromInput({ availability: "gratis" })).toBe("free");
    expect(resolveAvailabilityFromInput({ availability: "paid" })).toBe("paid");
    expect(resolveAvailabilityFromInput({ format: "GRATIS" })).toBe("free");
    expect(resolveAvailabilityFromInput({ format: "jpeg" })).toBe("paid");
  });

  it("resolveFileFormat mantém tipo real e nunca grava GRATIS", () => {
    expect(resolveFileFormat({ availability: "free", format: "jpeg" })).toBe("JPEG");
    expect(resolveFileFormat({ availability: "gratis", format: "psd" })).toBe("PSD");
    expect(resolveFileFormat({ availability: "paid", format: "jpeg" })).toBe("JPEG");
    expect(resolveFileFormat({ format: "psd" })).toBe("PSD");
    expect(resolveFileFormat({ availability: "free", format: "GRATIS", url: "file.png" })).toBe("PNG");
  });

  it("resolvePersistedFormat é alias de resolveFileFormat", () => {
    expect(resolvePersistedFormat({ availability: "free", format: "jpeg" })).toBe("JPEG");
  });

  it("mapGridItemFields expõe availability e format normalizado", () => {
    expect(
      mapGridItemFields({ format: "GRATIS", availability: "free", url: "x.psd" })
    ).toEqual({ format: "PSD", availability: "free" });

    expect(mapGridItemFields({ format: "jpeg", availability: "paid" })).toEqual({
      format: "JPEG",
      availability: "paid",
    });

    expect(resolveAvailability({ format: "GRATIS" })).toBe("free");
    expect(resolveDisplayFormat({ format: "GRATIS", url_thumb: "a.jpeg" })).toBe("JPEG");
  });

  it("appendFormatFilter trata GRATIS como availability free", () => {
    const where = [];
    const replacements = {};
    appendFormatFilter(where, replacements, "GRATIS");
    expect(where[0]).toContain("availability = 'free'");
    expect(isLegacyFreeFormat("gratis")).toBe(true);
  });

  it("appendFormatFilter trata JPG e JPEG como equivalentes", () => {
    const whereJpg = [];
    appendFormatFilter(whereJpg, {}, "JPG");
    expect(whereJpg[0]).toContain("IN ('JPG', 'JPEG')");

    const whereJpeg = [];
    appendFormatFilter(whereJpeg, {}, "JPEG");
    expect(whereJpeg[0]).toContain("IN ('JPG', 'JPEG')");
  });
});
