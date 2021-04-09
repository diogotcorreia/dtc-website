import { Box, Container } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { graphql } from 'gatsby';
import React from 'react';
import Category from '../components/impossiblelist/category';
import Splash from '../components/impossiblelist/splash';
import Layout from '../components/layout';
import Seo from '../components/seo';

const useStyles = makeStyles((theme) => ({
  section: {
    background: '#fff',
    paddingTop: 50,
    paddingBottom: 24,
    boxShadow: theme.shadows[2],
  },
}));

const SecondPage = ({ data }) => {
  const classes = useStyles();
  return (
    <Layout>
      <Seo title='Impossible List' />
      <Splash />
      <Box className={classes.section}>
        <Container>
          {data.json.nodes.map((category) => (
            <Category category={category} key={category.name} />
          ))}
        </Container>
      </Box>
    </Layout>
  );
};

export const query = graphql`
  query {
    json: allImpossiblelistJson {
      nodes {
        goals {
          edits {
            date
            link
            links
            value
          }
          name
          type
          subgoals
        }
        name
      }
    }
  }
`;

export default SecondPage;
