export const getGroupLabel = (group: number | null | undefined): string => {
  const g = group ?? 0;
  if (g === 0) return "Demo";
  if (g === 1) return "Founders";
  return `Group ${g}`;
};
