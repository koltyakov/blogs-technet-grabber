import { PostData } from './interfaces';

export const PostTemplate = (data: PostData): string => {
  return `
URL: ${data.url}
Author: ${data.author}
Date: ${data.date}
Tags: ${data.tags.join(', ')}
---

# ${data.title}

${data.content}
`.trim();
};
