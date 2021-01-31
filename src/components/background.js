import React, { Component } from 'react';
import styled from 'styled-components';
import Particles from 'react-tsparticles';

class ParticlesBackground extends Component {
  constructor(props) {
    super(props);
    this.state = { mobile: false };
  }

  updateMobileStatus = () => {
    var newValue = window.innerWidth < 600;
    if (newValue !== this.state.mobile) this.setState({ mobile: newValue });
  };

  componentDidMount() {
    this.updateMobileStatus();
    window.addEventListener('resize', this.updateMobileStatus);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateMobileStatus);
  }

  render() {
    const { className } = this.props;
    return (
      <Particles
        className={className}
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
              value: this.state.mobile ? 30 : 55,
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
  }
}

const StyledParticlesBackground = styled(ParticlesBackground)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #1b1b1b;
  z-index: -10;
`;

export default StyledParticlesBackground;
