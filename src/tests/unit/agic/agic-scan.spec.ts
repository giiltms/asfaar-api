import { AgicScanError, parseAgicScan } from '@modules/agic/agic-scan';

/**
 * The AGIC slip QR code encodes a verification URL. The gatehouse scanner
 * types it in like a keyboard, and staff also type the printed number by
 * hand. The old gatehouse input cut everything before the last non-letter,
 * turning AGIC-BIO-260929-62ACF5 into 62ACF5.
 */
describe('parseAgicScan', () => {
  const ref = 'AGIC-BIO-260929-62ACF5';

  it('reads the reference out of the slip QR code URL', () => {
    expect(
      parseAgicScan(
        `https://agicltd.com/verify/biometric?reference=${ref}&v=1&sig=1f1486a53e8074ae6f704734a2fc52036fd387b74962cea3010d6b0c1a37690f`,
      ),
    ).toBe(ref);
  });

  it('keeps the hyphens of a number typed by hand, in any case', () => {
    expect(parseAgicScan(`  ${ref.toLowerCase()} `)).toBe(ref);
  });

  it('rejects a URL without a reference', () => {
    expect(() =>
      parseAgicScan('https://agicltd.com/verify/biometric?v=1'),
    ).toThrow(AgicScanError);
  });

  it('rejects an ASFAAR reference number, which is looked up the usual way', () => {
    expect(() => parseAgicScan('SA00126000004')).toThrow(AgicScanError);
  });

  it('rejects empty and non-string input', () => {
    expect(() => parseAgicScan('')).toThrow(AgicScanError);
    expect(() => parseAgicScan(undefined)).toThrow(AgicScanError);
    expect(() => parseAgicScan({ scan: ref })).toThrow(AgicScanError);
  });

  it('rejects references with characters outside the AGIC format', () => {
    expect(() => parseAgicScan('AGIC-BIO-2609/../62ACF5')).toThrow(
      AgicScanError,
    );
    expect(() => parseAgicScan(`AGIC-BIO-${'A'.repeat(80)}`)).toThrow(
      AgicScanError,
    );
  });
});
