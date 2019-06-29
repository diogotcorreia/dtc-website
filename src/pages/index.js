import { Box, Container } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { graphql } from 'gatsby';
import React from 'react';
import Layout from '../components/layout';
import SEO from '../components/seo';
import Splash from '../components/splash';
const useStyles = makeStyles({
  section: {
    background: '#fff',
  },
  aboutmeContainer: {
    paddingTop: 24,
    paddingBottom: 24,
  },
  aboutme: {
    fontWeight: 300,
    padding: '1rem 0',
    fontSize: '1.5rem',
  },
});

const IndexPage = ({ data }) => {
  const classes = useStyles();
  return (
    <Layout>
      <SEO title='Home' />
      <Splash />
      <Box className={classes.section}>
        <Container className={classes.aboutmeContainer}>
          <div
            className={classes.aboutme}
            dangerouslySetInnerHTML={{ __html: data.aboutme.markdown.html }}
          />
        </Container>
      </Box>
    </Layout>
  );
};

export const query = graphql`
  query {
    aboutme: file(name: { eq: "aboutme" }, sourceInstanceName: { eq: "content" }) {
      markdown: childMarkdownRemark {
        html
      }
    }
  }
`;

export default IndexPage;
