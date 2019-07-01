import { makeStyles } from '@material-ui/styles';
import React from 'react';

const useStyles = makeStyles({
  root: {
    margin: '75px 0',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
  },
  h2: {
    marginBottom: 0,
  },
});

const SectionTitle = ({ title }) => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <h2 className={classes.h2}>{title}</h2>
    </div>
  );
};

export default SectionTitle;
