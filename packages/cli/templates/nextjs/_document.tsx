import Document, { Html, Head, Main, NextScript } from 'next/document';
import { locales } from '../i18n/locales';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps, locale: ctx.locale || 'en' };
  }

  render() {
    const currentLocale = this.props.locale;
    const localeObj = locales.find(l => l.code === currentLocale);
    const dir = localeObj ? localeObj.dir : 'ltr';

    return (
      <Html lang={currentLocale} dir={dir}>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
