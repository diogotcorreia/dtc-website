import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/styles';
import classnames from 'classnames';
import React from 'react';
import ProfileImage from '../profileImage';

const useStyles = makeStyles((theme) => ({
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
    fontSize: '4rem',
    marginTop: 30,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: '1.5rem',
  },
}));

const Splash = () => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <div className={classes.container}>
        <ProfileImage className={classes.picture} />
        <Typography variant='h1' className={classnames(classes.text, classes.title)}>
          Impossible List
        </Typography>
        <Typography variant='h4' className={classnames(classes.text, classes.subtitle)}>
          By Diogo Correia
        </Typography>
      </div>
    </div>
  );
};

export default Splash;
