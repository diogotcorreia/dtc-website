import { Link } from 'gatsby';
import PropTypes from 'prop-types';
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import useScrollTrigger from '@material-ui/core/useScrollTrigger';
import classnames from 'classnames';

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
  },
}));

const Header = ({ siteTitle }) => {
  const classes = useStyles();
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: window.innerHeight - 64 });
  return (
    <AppBar className={classnames({ [classes.root]: true, [classes.rootSplash]: !trigger })}>
      <Toolbar>
        <IconButton edge='start' className={classes.menuButton} color='inherit' aria-label='Menu'>
          <MenuIcon />
        </IconButton>
        <Typography variant='h6' className={classes.title}>
          {siteTitle}
        </Typography>
        <Button component={Link} to='' color='inherit'>
          About me
        </Button>
        <Button component={Link} to='' color='inherit'>
          Portfolio
        </Button>
        <Button component={Link} to='' color='inherit'>
          Contact me
        </Button>
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
