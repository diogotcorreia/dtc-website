import React from 'react';
import DiscordIcon from '../assets/discord.svg';
import GitHubIcon from '../assets/github.svg';
import MailIcon from '../assets/gmail.svg';
import InstagramIcon from '../assets/instagram.svg';
import SteamIcon from '../assets/steam.svg';
import StravaIcon from '../assets/strava.svg';
import TwitterIcon from '../assets/twitter.svg';
import ProfileImage from './profileImage';
import * as styles from './splash.module.css';

const Splash = () => {
  return (
    <div className={styles.splash}>
      <div className={`container ${styles.container}`}>
        <ProfileImage className={styles.profileImage} />
        <h1 className={styles.title}>Diogo Correia</h1>
        <h2 className={styles.subtitle}>Student, Developer &amp; Runner</h2>
        <div className={styles.icons}>
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
        </div>
      </div>
    </div>
  );
};

const Icon = ({ component: IconComponent, tooltip, analyticsEvent, ...props }) => (
  <div data-tooltip={tooltip} className={styles.tooltip}>
    <a target='_blank' rel='noopener' data-umami-event={`${analyticsEvent}-social-hero`} {...props}>
      <IconComponent className={styles.icon} />
    </a>
  </div>
);

export default Splash;
