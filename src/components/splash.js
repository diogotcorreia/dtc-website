import React, { Component } from 'react';
import Typography from '@material-ui/core/Typography';
import { Helmet } from 'react-helmet';
import { withStyles } from '@material-ui/styles';
import ProfileImage from './profileImage';
import classnames from 'classnames';

const styles = (theme) => ({
  root: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    marginBottom: 100,
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
});

class Splash extends Component {
  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <div className={classes.container}>
          <Helmet>
            <link
              href='https://fonts.googleapis.com/css?family=Nunito&display=swap&text=DiogoTorresCorreia'
              rel='stylesheet'
            />
          </Helmet>
          <ProfileImage className={classes.picture} />
          <Typography variant='h1' className={classnames(classes.text, classes.title)}>
            Diogo Correia
          </Typography>
          <Typography variant='h4' className={classnames(classes.text, classes.subtitle)}>
            Student, Developer &amp; Runner
          </Typography>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(Splash);
