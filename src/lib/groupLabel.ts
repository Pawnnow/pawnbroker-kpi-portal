export const getGroupLabel = (group: number | null | undefined): string => {
  const g = group ?? 0;
  return g === 1 ? "Founders" : `Group ${g}`;
};
