export const fetchDicomUrls = async (url: string) => {
  const res = await fetch(url);
  const json: {
    files: {
      url: string;
    }[];
  } = await res.json();

  return json.files.map((f) => f.url);
};
