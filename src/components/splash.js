import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/styles';
import classnames from 'classnames';
import React, { Component } from 'react';
import DiscordIcon from '../assets/discord.svg';
import GitHubIcon from '../assets/github.svg';
import MailIcon from '../assets/gmail.svg';
import InstagramIcon from '../assets/instagram.svg';
import SteamIcon from '../assets/steam.svg';
import StravaIcon from '../assets/strava.svg';
import TwitterIcon from '../assets/twitter.svg';
import ProfileImage from './profileImage';

const styles = (theme) => ({
  root: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    marginBottom: 50,
    marginTop: 50,
    width: '90%',
    maxWidth: 1280,
    [theme.breakpoints.down('sm')]: {
      width: '85%',
    },
    textAlign: 'center',
  },
  picture: {
    margin: 'auto',
    width: 100,
    borderRadius: 100,
  },
  text: {
    color: 'white',
  },
  title: {
    fontFamily: '"Nunito", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: '4rem',
    marginTop: 30,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: '1.5rem',
  },
  icons: {
    marginTop: 32,
  },
  icon: {
    width: 40,
    fill: '#fff',
    padding: '0 8px',
  },
});

class Splash extends Component {
  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <div className={classes.container}>
          <ProfileImage className={classes.picture} />
          <Typography variant='h1' className={classnames(classes.text, classes.title)}>
            Diogo Correia
          </Typography>
          <Typography variant='h4' className={classnames(classes.text, classes.subtitle)}>
            Student, Developer &amp; Runner
          </Typography>
          <div className={classes.icons}>
            <Icon
              tooltip='diogotcorreia'
              component={<GitHubIcon className={classes.icon} />}
              href='https://github.com/diogotcorreia'
              analyticsEvent='github'
            />
            <Icon
              tooltip='@diogotc2002'
              component={<TwitterIcon className={classes.icon} />}
              href='https://twitter.com/diogotc2002'
              analyticsEvent='twitter'
            />
            <Icon
              tooltip='DiogoCorreia#7295'
              component={<DiscordIcon className={classes.icon} />}
              analyticsEvent='discord'
            />
            <Icon
              tooltip='Diogo Correia'
              component={<StravaIcon className={classes.icon} />}
              href='https://www.strava.com/athletes/22762930'
              analyticsEvent='strava'
            />
            <Icon
              tooltip='rexcantor64'
              component={<SteamIcon className={classes.icon} />}
              href='https://steamcommunity.com/id/rexcantor64'
              analyticsEvent='steam'
            />
            <Icon
              tooltip='@diogotc2002'
              component={<InstagramIcon className={classes.icon} />}
              href='https://www.instagram.com/diogotc2002/'
              analyticsEvent='instagram'
            />
            <Icon
              tooltip='me@diogotc.com'
              component={<MailIcon className={classes.icon} />}
              href='mailto:me@diogotc.com'
              analyticsEvent='mail'
            />
          </div>
        </div>
      </div>
    );
  }
}

const Icon = ({ component, tooltip, analyticsEvent, ...props }) => (
  <Tooltip title={tooltip} interactive enterTouchDelay={0}>
    <a
      target='_blank'
      rel='noopener'
      className={`umami--click--${analyticsEvent}-social-hero`}
      {...props}
    >
      {component}
    </a>
  </Tooltip>
);

export default withStyles(styles)(Splash);
