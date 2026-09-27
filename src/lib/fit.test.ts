import { GLYPH, fitFontSize } from './fit';

describe('fitFontSize', () => {
  it('keeps the base size when the text fits', () => {
    expect(fitFontSize('Imposter', 40, 400)).toBe(40);
  });

  it('shrinks long single-line text to fit the width', () => {
    const size = fitFontSize('Undercover', 40, 200);
    expect(size).toBeLessThan(40);
    expect(size * GLYPH.display * 'Undercover'.length).toBeLessThanOrEqual(200);
  });

  it('in wrap mode only the longest word has to fit', () => {
    expect(fitFontSize('Hot Air Balloon', 60, 300, { wrap: true })).toBeGreaterThan(
      fitFontSize('Hot Air Balloon', 60, 300),
    );
  });

  it('never goes below the minimum', () => {
    expect(fitFontSize('Supercalifragilistic', 40, 50, { min: 16 })).toBe(16);
  });
});
