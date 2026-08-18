import Image from "next/image";

const SOCIAL_HANDLE = "@sudosource";
const SOCIAL_URL = "https://x.com/sudosource";
const EMAIL = "HELLO@sudosource.com";

export default function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="site-footer__inner">
        <span className="site-footer__flag site-footer__flag--underlined">
          <Image
            src="/us-flag.png"
            alt=""
            width={32}
            height={20}
            unoptimized
            className="site-footer__img site-footer__img--flag"
          />
        </span>
        <span className="site-footer__flag">
          <Image
            src="/deemo-logo.png"
            alt="Deemo"
            width={32}
            height={32}
            unoptimized
            className="site-footer__img site-footer__img--pixel"
          />
        </span>
        <a
          href={SOCIAL_URL}
          className="site-footer__text"
          target="_blank"
          rel="noopener noreferrer"
        >
          {SOCIAL_HANDLE}
        </a>
        <a href={`mailto:${EMAIL}`} className="site-footer__text">
          {EMAIL}
        </a>
      </div>
    </footer>
  );
}
