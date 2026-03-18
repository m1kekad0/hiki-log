import type { MetadataRoute } from 'next'

/** サイト URL */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'

/**
 * robots.txt を動的生成する。
 * 全クローラーにサイト全体のクロールを許可し、sitemap の場所を示す。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
