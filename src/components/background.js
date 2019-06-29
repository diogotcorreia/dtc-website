import React from 'react';
import Particles from 'react-particles-js';
import styled from 'styled-components';

const ParticlesBackground = ({ className }) => (
  <Particles
    className={className}
    params={{
      particles: {
        number: {
          value: 50,
        },
        size: {
          value: 3,
        },
      },
      retina_detect: false,
    }}
  />
);

const StyledParticlesBackground = styled(ParticlesBackground)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #181f1b;
  z-index: -10;
`;

export default StyledParticlesBackground;
