import React from 'react';
import { StaticQuery, graphql } from 'gatsby';
import Img from 'gatsby-image';

const Image = ({ className }) => (
  <StaticQuery
    query={graphql`
      query {
        placeholderImage: file(relativePath: { eq: "profile-fullres-cropped.jpg" }) {
          childImageSharp {
            fixed(width: 100, height: 100) {
              ...GatsbyImageSharpFixed_withWebp
            }
          }
        }
      }
    `}
    render={(data) => (
      <Img fixed={data.placeholderImage.childImageSharp.fixed} className={className} />
    )}
  />
);
export default Image;
