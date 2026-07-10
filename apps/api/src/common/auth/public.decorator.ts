import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
// Marks a route as unauthenticated (public careers pages, login, offer acceptance).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
