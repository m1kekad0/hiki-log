---
title: "【Daily Log】自作 Notion ブログを（Claude Code が）本気で改修した話：SEO・TOC・ページネーションほか全部盛り"
summary: "Next.js + Notion ブログを SEO、パフォーマンス、UX の観点から大幅アップデート。OGP 設定から Cloudflare Workers へのデプロイ、画像最適化まで、実施した 8 つの改善内容を解説。"
tags:
  - "Next.js"
  - "Notion"
  - "ClaudeCode"
  - "Cloudflare"
  - "ブログ構築"
category: "😎 Daily"
publishedAt: "2026-03-13"
updatedAt: "2026-03-15"
published: true
---


## 概要


以前から運用していた Next.js + Notion 製のブログを、「SEO・パフォーマンス・UX」の観点から全面的に改修しました。実施した 8 つの改善項目をコミット単位で振り返ります。


---


## はじめに


「動けばいい」状態からそろそろ脱却しようと思い、本日まとめて改修を実施した。やったことを一言で言うと「SEO・パフォーマンス・UX の全方位改善」。


というのは建前で、PC（MacBook Air M5）を新調し、Claude Code（Pro プラン）を契約したので、試運転＋操作慣れのためにブログアプリの改修をお願いしたのが実態です😇


---


## 実施内容


## 1. OGP / SEO メタタグの追加


`generateMetadata()` を使って記事ごとに `og:*` / `twitter:*` タグを動的生成するようにした。


```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPostBySlug(slug);
  return {
    title: post.title,
    openGraph: {
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: { card: "summary" },
  };
}
```


`layout.tsx` 側にはサイト全体のデフォルト OGP と `metadataBase` を設定。SNS でシェアしたときにちゃんとカードが出るようになった。


## 2. タグフィルタリング・アーカイブページ (/tags/[tag])


記事カードのタグをクリックすると `/tags/ClaudeCode` のようなアーカイブページに遷移できるようにした。`generateStaticParams` で全タグを静的生成しているので、ISR の恩恵も受けられる。


```typescript
// src/components/TagLink.tsx
export default function TagLink({ tag }: { tag: string }) {
  return (
    <Link href={`/tags/${encodeURIComponent(tag)}`} className="...">
      {tag}
    </Link>
  );
}
```

> **ハマりポイント**
>
> 記事カード全体を `<Link>` で囲んで内部に `<TagLink>` を置いたら、`<a>` タグのネストになり Hydration エラーが発生した。`<article>` + `<Link>`（タイトル部分のみ）に分離することで解消。
>
>

## 3. デバッグログ削除 & TypeScript 型安全性の改善


`notion.ts` に残っていた `console.log()` を 6 箇所削除。あわせて `getPostBySlug` の戻り値を `Promise<any>` から `Promise<Post | undefined>` に変更するなど型を整理。


`@notionhq/client v5.9.0` では `isFullPage()` を使うと全件フィルタアウトされる問題があったため、`(item: any)` + `eslint-disable` コメントで回避している。


## 4. Next.js Image コンポーネントで Notion 画像を最適化


Notion から取得した画像が素の `<img>` タグになっていたので `next/image` に置き換えた。


```typescript
img: ({ src, alt }) => {
  const imgSrc = typeof src === "string" ? src : "";
  if (!imgSrc) return null;
  return (
    <span className="block my-4">
      <Image
        src={imgSrc}
        width={0}
        height={0}
        sizes="100vw"
        style={{ width: "100%", height: "auto" }}
        className="rounded-lg"
      />
    </span>
  );
},
```


`next.config.ts` に Notion / AWS S3 のドメインを `remotePatterns` で許可。


```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "*.notion.so" },
    { protocol: "https", hostname: "prod-files-secure.s3.us-west-2.amazonaws.com" },
  ],
}
```


## 5. ページネーション


全記事を一気に取得・表示していたので `?page=N` で 10 件ずつ分割。範囲外のページ番号が来たときは最終ページにフォールバックするように実装。


```typescript
const PAGE_SIZE = 10;
const safePage = Math.min(currentPage, totalPages);
const posts = allPosts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
```


## 6. 目次（TOC）の自動生成とスクロール連動ハイライト


h2 / h3 から自動で目次を生成するコンポーネントを実装。`IntersectionObserver` でスクロール位置を監視し、現在表示中の見出しをハイライトする。


```typescript
// src/lib/toc.ts
export function extractHeadings(markdown: string): Heading[] {
  for (const line of markdown.split("\n")) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    const id = text.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff-]/g, "");
    headings.push({ level, text, id });
  }
}
```


## 7. Sitemap & RSS フィード


SEO 強化として `sitemap.xml` と RSS フィード（`feed.xml`）を追加。

- **sitemap.ts**: Next.js 組み込み API で生成。
- **feed.xml**: RSS 2.0 形式で `revalidate=3600` 設定。

## 8. Cloudflare Workers デプロイ設定


`@opennextjs/cloudflare` を導入。`package.json` の `build` スクリプトはそのままに、Cloudflare 向けに `build:worker` を分離して二重実行を防止。


コード スニペット


```json
// wrangler.jsonc
{
  "name": "notion-blog",
  "compatibility_date": "2026-03-13",
  "compatibility_flags": ["nodejs_compat"],
  "main": ".open-next/worker.js",
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```


---


## まとめ


| **対応項目**               | **効果**                |
| ---------------------- | --------------------- |
| **OGP / SEO メタタグ**     | SNS シェア時のカード表示、検索流入改善 |
| **タグアーカイブ**            | 関連記事への回遊性向上           |
| **Next.js Image**      | WebP 自動変換・遅延読み込み      |
| **ページネーション**           | 初期ロード軽量化              |
| **TOC**                | 長記事の読みやすさ向上           |
| **Sitemap / RSS**      | クローラーへのインデックス促進       |
| **Cloudflare Workers** | エッジ配信による高速化           |


「とりあえず動く」から「ちゃんと作られている」ブログへ、一気に底上げできた。

