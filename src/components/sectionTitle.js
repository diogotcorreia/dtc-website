import { makeStyles } from '@material-ui/styles';
import React from 'react';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles({
  root: {
    padding: '75px 0',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
  },
  title: {
    marginBottom: 0,
  },
});

const SectionTitle = ({ title, ...props }) => {
  const classes = useStyles();
  return (
    <div className={classes.root} {...props}>
      <Typography variant='h4' className={classes.title}>
        {title}
      </Typography>
    </div>
  );
};

export default SectionTitle;
