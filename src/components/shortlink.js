import { useEffect } from 'react';
import { graphql } from 'gatsby';

export default ({ data }) => {
  useEffect(() => {
    var link = data.allSitePage.edges[0].node.context;
    window.location.href = link;
  }, []);
  return null;
};

export const query = graphql`
  query($path: String!) {
    allSitePage(filter: { path: { eq: $path } }) {
      edges {
        node {
          context
        }
      }
    }
  }
`;
