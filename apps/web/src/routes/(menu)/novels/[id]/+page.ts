import type { MenuPageData } from '../../_types/page-data';
import type { PageLoad } from './$types';

export const load: PageLoad<MenuPageData> = () => {
  return {
    type: 'menu',
    pageTitle: '小説の編集',
    forceFullScreen: true,
  };
};
