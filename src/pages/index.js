import React from 'react';

import Layout from '../components/layout';
import SEO from '../components/seo';
import Splash from '../components/splash';

const IndexPage = () => (
  <Layout>
    <SEO title='Home' />
    <div>
      <Splash />
    </div>
  </Layout>
);

export default IndexPage;
