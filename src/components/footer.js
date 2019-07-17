import React from 'react';
import { makeStyles } from '@material-ui/styles';
import { Container, Grid, Typography } from '@material-ui/core';
import { Link } from 'gatsby';
import AnchorLink from 'react-anchor-link-smooth-scroll';

const useStyles = makeStyles((theme) => ({
  root: {
    background: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    paddingTop: theme.spacing(2),
    boxShadow: theme.shadows[2],
    '& a': {
      color: '#00acff',
      textDecoration: 'none',
    },
  },
  header: {
    fontSize: '1.45rem',
    lineHeight: '110%',
    margin: '.82rem 0 .656rem 0',
    fontWeight: 400,
  },
  lightText: {
    fontWeight: 300,
  },
  list: {
    listStyleType: 'none',
    marginLeft: 0,
  },
  credits: {
    background: theme.palette.primary.dark,
    padding: `${theme.spacing(1)}px 0`,
  },
  creditsText: {
    fontWeight: 300,
    fontSize: '0.80rem',
  },
}));

const Footer = ({ homepage }) => {
  var classes = useStyles();
  return (
    <footer className={classes.root}>
      <Container>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant='h5' className={classes.header}>
              Contact me
            </Typography>
            <ul className={classes.list}>
              <Typography variant='body2' component='li'>
                Email:{' '}
                <span className={classes.lightText}>
                  <a href='mailto:me@diogotc.com'>me@diogotc.com</a>
                </span>
              </Typography>
              <Typography variant='body2' component='li'>
                Discord: <span className={classes.lightText}>Rexcantor64#7413</span>
              </Typography>
              <Typography variant='body2' component='li'>
                Twitter:{' '}
                <span className={classes.lightText}>
                  <a
                    href='https://twitter.com/diogotc2002'
                    rel='noopener noreferrer'
                    target='_blank'
                  >
                    @diogotc2002
                  </a>
                </span>
              </Typography>
            </ul>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant='h5' className={classes.header}>
              Site map
            </Typography>
            <ul className={classes.list}>
              <Typography variant='body2' component='li'>
                {homepage ? (
                  <AnchorLink offset='64' href='#aboutme'>
                    About me
                  </AnchorLink>
                ) : (
                  <Link to='/#aboutme'>About me</Link>
                )}
              </Typography>
              <Typography variant='body2' component='li'>
                {homepage ? (
                  <AnchorLink offset='64' href='#portfolio'>
                    Portfolio
                  </AnchorLink>
                ) : (
                  <Link to='/#portfolio'>Portfolio</Link>
                )}
              </Typography>
              <Typography variant='body2' component='li'>
                <Link to='/impossiblelist'>Impossible List</Link>
              </Typography>
            </ul>
          </Grid>
        </Grid>
      </Container>
      <div className={classes.credits}>
        <Container>
          <Typography variant='body2' className={classes.creditsText}>
            © 2017-{new Date().getFullYear()} Diogo Torres Correia
          </Typography>
        </Container>
      </div>
    </footer>
  );
};

export default Footer;
