import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import React from 'react';
import Goal from './goal';

const useStyles = makeStyles((theme) => ({
  root: {
    '& a': {
      textDecoration: 'none',
      color: '#037daf',
    },
    '& li': {
      ...theme.typography.body2,
    },
  },
  title: {
    marginBottom: 15,
  },
}));

const Category = ({ category }) => {
  var classes = useStyles();
  return (
    <div className={classes.root}>
      <Typography variant='h5' className={classes.title}>
        {category.name}
      </Typography>
      <ul>
        {category.goals.map((goal) => (
          <Goal goal={goal} key={goal.name} />
        ))}
      </ul>
    </div>
  );
};

export default Category;
