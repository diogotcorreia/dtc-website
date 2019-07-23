import React, { Component } from 'react';
import Particles from 'react-particles-js';
import styled from 'styled-components';

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
        params={{
          particles: {
            number: {
              value: this.state.mobile ? 20 : 50,
            },
            size: {
              value: 3,
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
