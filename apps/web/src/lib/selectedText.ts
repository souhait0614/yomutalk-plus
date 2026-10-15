import type { NovelInline, NovelTextType } from '@repo/novel-parser';

export type { NovelTextType };

export interface NovelTextPosition {
  readonly blockIndex: number;
  readonly sentenceIndex: number;
  readonly textOffset: number;
}

export interface NovelSelectionRange {
  readonly start: NovelTextPosition;
  readonly end: NovelTextPosition;
}

export interface SelectedNovelText {
  readonly documentId: string;
  readonly inlines: NovelInline[];
  readonly registrationMethod: 'selection';
  readonly selectionRange: NovelSelectionRange;
  readonly textType: NovelTextType;
}

export interface ManuallyEnteredText {
  readonly documentId: null;
  readonly inlines: NovelInline[];
  readonly registrationMethod: 'manual';
  readonly selectionRange: null;
  readonly textType: NovelTextType;
}

export type RegisteredText = ManuallyEnteredText | SelectedNovelText;

export const copyRegisteredText = (registeredText: RegisteredText): RegisteredText => {
  if (registeredText.registrationMethod === 'selection') {
    return {
      documentId: registeredText.documentId,
      inlines: registeredText.inlines,
      registrationMethod: registeredText.registrationMethod,
      selectionRange: registeredText.selectionRange,
      textType: registeredText.textType,
    };
  }
  return {
    documentId: registeredText.documentId,
    inlines: registeredText.inlines,
    registrationMethod: registeredText.registrationMethod,
    selectionRange: registeredText.selectionRange,
    textType: registeredText.textType,
  };
};
