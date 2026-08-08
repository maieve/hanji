# Recent colors verification

## Automated coverage

Run `npm run test:brush-controls`.

The verifier checks that recent colors:

- accept only complete six-digit HEX colors;
- normalize colors to uppercase before comparison and storage;
- remove case-insensitive duplicates while preserving recency order;
- move a reused color to the newest position;
- keep exactly the newest eight entries.

## iPad gate G80

1. Open a notebook and select eight different colors using the system picker or HEX field.
2. Confirm the toolbar shows all eight under the recent-colors accessibility group in newest-first order, independently of the five default palette colors.
3. Reuse the oldest recent color and confirm it moves to the first position without creating a duplicate.
4. Close yoojin note completely, reopen the same notebook, and confirm the eight colors and their order remain available.
5. With VoiceOver enabled, confirm each swatch is announced as `최근 색상 N, #RRGGBB` and the default swatches are announced separately.

Pass when all five checks succeed on the target iPad.
