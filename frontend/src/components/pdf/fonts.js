import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'DM Serif Display',
  src: '/fonts/DMSerifDisplay-Regular.ttf',
});

Font.register({
  family: 'IBM Plex Sans',
  fonts: [
    { src: '/fonts/IBMPlexSans-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/IBMPlexSans-SemiBold.ttf', fontWeight: 600 },
  ],
});

Font.register({
  family: 'JetBrains Mono',
  src: '/fonts/JetBrainsMono-Regular.ttf',
});

Font.registerHyphenationCallback((word) => [word]);
