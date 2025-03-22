import React from 'react';
import "../styles/global.css"; // Import global CSS here
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps): React.ReactElement {
  return <Component {...pageProps} />;
}

export default MyApp; 