import React, { useCallback, useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';

const ParticlesBackground = ({ className }) => {
  const [mobile, setMobile] = useState(false);

  const updateMobileStatus = useCallback(() => {
    setMobile(window.innerWidth < 600);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateMobileStatus);
    return () => {
      window.removeEventListener('resize', updateMobileStatus);
    };
  }, [updateMobileStatus]);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      className={className}
      init={particlesInit}
      options={{
        particles: {
          links: {
            enable: true,
            distance: 100,
            opacity: 0.5,
          },
          number: {
            density: {
              enable: true,
              value_area: 800,
            },
            value: mobile ? 30 : 55,
          },
          size: {
            value: 3,
          },
          move: {
            direction: 'none',
            enable: true,
            outMode: 'bounce',
            random: false,
            speed: 2,
            straight: false,
          },
          opacity: {
            value: 0.5,
          },
        },
        interactivity: {
          detectsOn: 'window',
          events: {
            onhover: {
              enable: true,
              mode: 'bubble',
              parallax: {
                enable: true,
                force: 100,
                smooth: 10,
              },
            },
          },
          modes: {
            bubble: {
              distance: 250,
              duration: 2,
              opacity: 1,
              size: 6,
            },
          },
        },
        retina_detect: true,
      }}
    />
  );
};

const StyledParticlesBackground = styled(ParticlesBackground)({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: '#1b1b1b',
  zIndex: -10,
});

export default StyledParticlesBackground;
