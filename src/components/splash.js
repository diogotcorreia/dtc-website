import { css } from '@emotion/react';
import { Box, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import DiscordIcon from '../assets/discord.svg';
import GitHubIcon from '../assets/github.svg';
import MailIcon from '../assets/gmail.svg';
import InstagramIcon from '../assets/instagram.svg';
import SteamIcon from '../assets/steam.svg';
import StravaIcon from '../assets/strava.svg';
import TwitterIcon from '../assets/twitter.svg';
import ProfileImage from './profileImage';

const Container = styled('div')(({ theme }) => ({
  marginBottom: 50,
  marginTop: 50,
  width: '90%',
  maxWidth: 1280,
  [theme.breakpoints.down('md')]: {
    width: '85%',
  },
  textAlign: 'center',
}));

const Title = styled(Typography)({
  color: 'white',
  fontFamily: '"Nunito", "Roboto", "Helvetica", "Arial", sans-serif',
  fontSize: '4rem',
  marginTop: 30,
  marginBottom: 10,
});

const Subtitle = styled(Typography)({
  color: 'white',
  fontSize: '1.5rem',
});

const RoundProfileImage = styled(ProfileImage)({
  margin: 'auto',
  width: 100,
  borderRadius: 100,
});

const iconStyle = css({
  width: 40,
  fill: '#fff',
  padding: '0 8px',
});

const Splash = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Container>
        <RoundProfileImage />
        <Title variant='h1'>Diogo Correia</Title>
        <Subtitle variant='h4'>Student, Developer &amp; Runner</Subtitle>
        <Box sx={{ marginTop: 4 }}>
          <Icon
            tooltip='diogotcorreia'
            component={GitHubIcon}
            href='https://github.com/diogotcorreia'
            analyticsEvent='github'
          />
          <Icon
            tooltip='@diogotc2002'
            component={TwitterIcon}
            href='https://twitter.com/diogotc2002'
            analyticsEvent='twitter'
          />
          <Icon tooltip='DiogoCorreia#7295' component={DiscordIcon} analyticsEvent='discord' />
          <Icon
            tooltip='Diogo Correia'
            component={StravaIcon}
            href='https://www.strava.com/athletes/22762930'
            analyticsEvent='strava'
          />
          <Icon
            tooltip='rexcantor64'
            component={SteamIcon}
            href='https://steamcommunity.com/id/rexcantor64'
            analyticsEvent='steam'
          />
          <Icon
            tooltip='@diogotc2002'
            component={InstagramIcon}
            href='https://www.instagram.com/diogotc2002/'
            analyticsEvent='instagram'
          />
          <Icon
            tooltip='me@diogotc.com'
            component={MailIcon}
            href='mailto:me@diogotc.com'
            analyticsEvent='mail'
          />
        </Box>
      </Container>
    </Box>
  );
};

const Icon = ({ component: IconComponent, tooltip, analyticsEvent, ...props }) => (
  <Tooltip title={tooltip} enterTouchDelay={0}>
    <a target='_blank' rel='noopener' data-umami-event={`${analyticsEvent}-social-hero`} {...props}>
      <Box
        sx={{
          display: 'inline',
          '& svg': {
            width: 40,
            fill: '#fff',
            padding: '0 8px',
          },
        }}
      >
        <IconComponent css={iconStyle} />
      </Box>
    </a>
  </Tooltip>
);

export default Splash;
