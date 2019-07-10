import { Hidden } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import { makeStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import useScrollTrigger from '@material-ui/core/useScrollTrigger';
import MenuIcon from '@material-ui/icons/Menu';
import classnames from 'classnames';
import { Link } from 'gatsby';
import PropTypes from 'prop-types';
import React from 'react';
import AnchorLink from 'react-anchor-link-smooth-scroll';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    transition: 'all 250ms',
  },
  rootSplash: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
    color: theme.palette.primary.contrastText,
    textDecoration: 'none',
  },
}));

const Header = ({ siteTitle, homepage }) => {
  const classes = useStyles();
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 100 });
  return (
    <AppBar className={classnames({ [classes.root]: true, [classes.rootSplash]: !trigger })}>
      <Toolbar>
        <Hidden smUp>
          <IconButton edge='start' className={classes.menuButton} color='inherit' aria-label='Menu'>
            <MenuIcon />
          </IconButton>
        </Hidden>
        <Typography
          variant='h6'
          component={homepage ? AnchorLink : Link}
          href='#top'
          to='/'
          className={classes.title}
        >
          {siteTitle}
        </Typography>
        <Hidden xsDown>
          <Button component={AnchorLink} offset='64' href='#aboutme' color='inherit'>
            About me
          </Button>
          <Button component={AnchorLink} offset='64' href='#portfolio' color='inherit'>
            Portfolio
          </Button>
          <Button component={Link} to='/impossiblelist' color='inherit'>
            Impossible List
          </Button>
        </Hidden>
      </Toolbar>
    </AppBar>
  );
};

Header.propTypes = {
  siteTitle: PropTypes.string,
};

Header.defaultProps = {
  siteTitle: ``,
};

export default Header;
