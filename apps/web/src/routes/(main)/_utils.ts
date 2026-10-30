import type { NovelInline } from '@repo/novel-parser';

export function contentToText(inlines: NovelInline[], useRubyReading = false) {
  return inlines
    .map((inline) => {
      if (inline.type === 'text') return inline.value;
      if (inline.type === 'bracket') return inline.value;
      if (inline.type === 'space') return inline.value;
      if (inline.type === 'ruby') return useRubyReading ? inline.reading : inline.base;
      return inline.reading ?? '□';
    })
    .join('')
    .trim();
}
