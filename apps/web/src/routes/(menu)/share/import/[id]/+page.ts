import type { MenuPageData } from '../../../_types/page-data';
import type { PageLoad } from './$types';

export const load: PageLoad<MenuPageData> = () => {
  return {
    type: 'menu',
    pageTitle: '共有された小説を追加',
  };
};
