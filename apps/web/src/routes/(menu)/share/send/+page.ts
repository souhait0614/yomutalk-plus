import { m } from '$lib/paraglide/messages';

import type { MenuPageData } from '../../_types/page-data';
import type { PageLoad } from './$types';

export const load: PageLoad<MenuPageData> = () => {
  return {
    type: 'menu',
    pageTitle: m.nav_share_send(),
  };
};
