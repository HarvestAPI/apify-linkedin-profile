export const isCompanyUrl = (url: string) => {
  if (
    url &&
    (url.includes('linkedin.com/company/') ||
      url.includes('linkedin.com/school/') ||
      url.includes('linkedin.com/organization/') ||
      url.includes('linkedin.com/showcase/'))
  ) {
    return true;
  }
  return false;
};
