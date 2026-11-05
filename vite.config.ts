import { defineConfig, type Plugin } from 'vite';
import { textLibrary } from './scripts/text-library';

/**
 * 공유 미리보기(OG)·canonical에는 절대 주소가 필요해서 빌드 시 %SITE_URL%을 채움
 *  1) SITE_URL 환경 변수 (직접 지정, 예: 커스텀 도메인)
 *  2) Vercel 빌드 시 자동 제공되는 VERCEL_PROJECT_PRODUCTION_URL
 */
const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');

const siteUrl = (): Plugin => ({
  name: 'site-url',
  // 'pre': Vite가 <link href>를 검사하기 전에 먼저 치환해야 함
  transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%SITE_URL%', SITE_URL.replace(/\/$/, '')) },
});

export default defineConfig({
  base: '/',
  server: { port: 5174 },
  plugins: [siteUrl(), textLibrary(SITE_URL.replace(/\/$/, ''))],
});
