import assert from 'node:assert/strict';
import {contrastRatio,darkChrome,lightChrome,webDynamicColor} from '../src/themePalette.ts';

for(const palette of [lightChrome,darkChrome]){
  assert.ok(contrastRatio(palette.ink,palette.surface)>=4.5,'surface body text must meet WCAG AA');
  assert.ok(contrastRatio(palette.muted,palette.surface)>=4.5,'surface secondary text must meet WCAG AA');
  assert.ok(contrastRatio(palette.ink,palette.sidebar)>=4.5,'sidebar body text must meet WCAG AA');
  assert.ok(contrastRatio(palette.surface,palette.accent)>=4.5,'accent controls must meet WCAG AA');
}
assert.equal(webDynamicColor('#FFFFFF','#000000'),'light-dark(#FFFFFF, #000000)');
console.log('Theme contrast verification passed.');
