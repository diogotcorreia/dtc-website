/**
 * Layout component that queries for data
 * with Gatsby's StaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/static-query/
 */

import { graphql, StaticQuery } from 'gatsby';
import PropTypes from 'prop-types';
import React from 'react';
import Background from './background';
import Header from './header';
import Footer from './footer';
import './layout.css';

const Layout = ({ children, homepage }) => (
  <StaticQuery
    query={graphql`
      query SiteTitleQuery {
        site {
          siteMetadata {
            shortTitle
          }
        }
      }
    `}
    render={(data) => (
      <>
        <Background />
        <Header siteTitle={data.site.siteMetadata.shortTitle} homepage={homepage} />
        <main id='top'>{children}</main>
        <Footer homepage={homepage} />
      </>
    )}
  />
);

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
