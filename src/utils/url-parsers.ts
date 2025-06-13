export const isProfileUrl = (url: string) => {
  if (url && url.includes('linkedin.com/in/')) {
    return true;
  }
  return false;
};
