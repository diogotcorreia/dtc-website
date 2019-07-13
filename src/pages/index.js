import { Box, Container, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { graphql } from 'gatsby';
import React from 'react';
import Layout from '../components/layout';
import SectionTitle from '../components/sectionTitle';
import SEO from '../components/seo';
import Splash from '../components/splash';
import Timeline from '../components/timeline';
import TopProjects from '../components/topProjects';

const useStyles = makeStyles((theme) => ({
  section: {
    background: '#fff',
    paddingTop: 24,
    paddingBottom: 24,
    boxShadow: theme.shadows[2],
  },
  aboutme: {
    fontWeight: 300,
    padding: '1rem 0',
    fontSize: '1.5rem',
  },
  topProjectsTitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 500,
  },
}));

const IndexPage = ({ data }) => {
  const classes = useStyles();
  return (
    <Layout homepage>
      <SEO title='Home' />
      <Splash />
      <Box className={classes.section} id='aboutme'>
        <Container>
          <div
            className={classes.aboutme}
            dangerouslySetInnerHTML={{ __html: data.aboutme.markdown.html }}
          />
        </Container>
      </Box>
      <SectionTitle title='Portfolio' id='portfolio' />
      <Box className={classes.section}>
        <Container>
          <Typography className={classes.topProjectsTitle} variant='h5'>
            My top projects
          </Typography>
          <TopProjects topProjects={data.topProjects.nodes} />
          <Typography className={classes.topProjectsTitle} variant='h5'>
            Timeline
          </Typography>
          <Timeline data={data.timeline.nodes}/>
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
    topProjects: allMarkdownRemark(
      filter: {
        fileAbsolutePath: { regex: "/topprojects/" }
        internal: { type: { eq: "MarkdownRemark" } }
      }
      sort: { fields: frontmatter___order, order: ASC }
    ) {
      nodes {
        html
        frontmatter {
          name
          link
          calltoaction
          background
          color
          icon {
            childImageSharp {
              fixed(width: 80, height: 80) {
                ...GatsbyImageSharpFixed_withWebp
              }
            }
          }
        }
      }
    }
    timeline: allMarkdownRemark(
      filter: {
        fileAbsolutePath: { regex: "/timeline/" }
        internal: { type: { eq: "MarkdownRemark" } }
      }
      sort: { fields: frontmatter___order, order: DESC }
    ) {
      nodes {
        html
        frontmatter {
          title
          subtitle
          date
          iconName
        }
      }
    }
  }
`;

export default IndexPage;
