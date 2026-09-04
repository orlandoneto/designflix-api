const TagGenerator = require('../../src/utils/tagGenerator');

describe('TagGenerator', () => {
  it('generateContextualTags não usa o nome WhatsApp inteiro como tag', () => {
    const tags = TagGenerator.generateContextualTags(
      'WhatsApp Image 2026-08-25 at 15.55.51 (1).jpeg',
      'JPEG',
      'Agência'
    );
    expect(tags).toContain('Agência');
    expect(tags).toContain('JPEG');
    expect(tags.some((t) => /whatsapp/i.test(t))).toBe(false);
    expect(tags.some((t) => t.split(' ').length >= 5)).toBe(false);
  });

  it('isFilenameDumpTag detecta dump', () => {
    expect(
      TagGenerator.isFilenameDumpTag(
        'Whatsapp image 2026 08 25 at 15 55 51 1'
      )
    ).toBe(true);
    expect(TagGenerator.isFilenameDumpTag('Academia')).toBe(false);
  });

  it('sanitizeStoredTags troca dump por categoria/formato', () => {
    const cleaned = TagGenerator.sanitizeStoredTags(
      [{ id: 1, name: 'Whatsapp image 2026 08 25 at 15 55 51 1' }],
      { categoryName: 'Agência', format: 'JPEG' }
    );
    expect(cleaned.every((t) => !/whatsapp/i.test(t.name))).toBe(true);
    expect(cleaned.some((t) => t.name === 'Agência' || t.name === 'JPEG')).toBe(
      true
    );
  });
});
