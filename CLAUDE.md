@AGENTS.md

## House rules

- **No em dashes (—) anywhere in this project.** Not in UI copy, code comments,
  docs, or config. Use a comma, a semicolon, a colon, or split the sentence.
  (The reference parser in `src/lib/scripture/refs.ts` may still *recognize* an
  em dash in pasted user input, but never render one.)
- **Bible text uses the app's own type.** Scripture is set in the app body
  serif (`fonts.serif`, i.e. Lora) at the entry-reading size, not a separate
  Bible font, so reading scripture and reading a journal entry feel the same.
- **Only ship scripture we have the rights to.** Public-domain translations
  (WEB, KJV, ASV, BSB) may be bundled or hosted for download. Copyrighted
  translations (NKJV, ESV, NIV, etc.) must never be bundled or redistributed;
  they require a license or a licensed Bible API and a user-supplied source.
  Keep the app download small: bundle one public-domain default, fetch other
  versions on demand.
