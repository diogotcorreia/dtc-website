/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery hook
 *
 * See: https://www.gatsbyjs.com/docs/how-to/querying-data/use-static-query/
 */

import { graphql, useStaticQuery } from 'gatsby';
import PropTypes from 'prop-types';
import React from 'react';
import Background from './background';
import Header from './header';
import Footer from './footer';
import 'normalize.css';
import './layout.css';

const Layout = ({ children, homepage = false }) => {
  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          shortTitle
        }
      }
    }
  `);
  return (
    <>
      <Background />
      <Header siteTitle={data.site.siteMetadata.shortTitle} homepage={homepage} />
      <main id='top'>{children}</main>
      <Footer homepage={homepage} />
    </>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
