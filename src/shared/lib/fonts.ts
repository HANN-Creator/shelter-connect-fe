import { Platform } from 'react-native';

// RN resolves custom fonts differently per platform: iOS needs the font's own
// PostScript name, Android matches the .ttf filename verbatim. Galmuri11's
// regular weight happens to differ between the two (Galmuri11-Regular vs
// Galmuri11); the rest line up by coincidence.
export const fonts = {
  pixel: Platform.select({ ios: 'Galmuri11-Regular', default: 'Galmuri11' }),
  pixelBold: 'Galmuri11-Bold',
  body: 'GowunDodum-Regular',
};
