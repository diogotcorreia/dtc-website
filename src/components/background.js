import React from 'react';
import { graphql, StaticQuery } from 'gatsby';
import styled from 'styled-components';

import BackgroundImage from 'gatsby-background-image';

const BackgroundSection = ({ className, children }) => (
  <StaticQuery
    query={graphql`
      query {
        desktop: file(relativePath: { eq: "parallax-fullres.jpg" }) {
          childImageSharp {
            fluid(quality: 90, maxWidth: 4640) {
              ...GatsbyImageSharpFluid_withWebp
            }
          }
        }
      }
    `}
    render={(data) => {
      // Set ImageData.
      const imageData = data.desktop.childImageSharp.fluid;
      return (
        <BackgroundImage
          Tag='section'
          className={className}
          fluid={imageData}
          backgroundColor={`#1E88E5`}
          style={{ backgroundAttachment: 'fixed' }}
        >
          {children}
        </BackgroundImage>
      );
    }}
  />
);

const StyledBackgroundSection = styled(BackgroundSection)`
  width: 100%;
  min-height: 100vh;
  background-position: bottom center;
  background-repeat: repeat-y;
  background-size: cover;
  overflow: auto;
`;

export default StyledBackgroundSection;
