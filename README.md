# blogs.technet.microsoft.com grabber

## Prerequisites

Node.js/NPM

## Restore dependencies

```bash
npm istall
```

## Backup your blogs

```bash
npm run start -- [URL_TO_BLOG_LIST_PAGE]`
```

for instance:

```bash
npm run start -- https://blogs.technet.microsoft.com/blog/tag/azure/
```

Blog posts should be dumped to local `data` folder.