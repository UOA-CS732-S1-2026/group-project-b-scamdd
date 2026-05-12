export interface UserCategory {
  _id: string;
  userId: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export const CATEGORY_COLOR_PALETTE = [
  '#FFBDC2', '#C5FFD8', '#FDFBD4', '#C68BE1',
  '#B5C9E8', '#FFD4A8', '#D4F8E0', '#FFC8E8',
  '#B5D8FF', '#FFE0B5', '#C8F5FF', '#E8D4FF',
] as const;
