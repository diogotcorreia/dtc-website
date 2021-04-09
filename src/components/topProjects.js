import { Button, Card, CardActions, CardContent, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { GatsbyImage } from 'gatsby-plugin-image';
import React from 'react';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexFlow: 'row wrap',
    justifyContent: 'center',
    alignContent: 'center',
  },
}));

const TopProjects = ({ topProjects }) => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      {topProjects.map((project) => (
        <Project
          key={project.frontmatter.name}
          name={project.frontmatter.name}
          content={project.html}
          icon={project.frontmatter.icon.childImageSharp.gatsbyImageData}
          link={project.frontmatter.link}
          calltoaction={project.frontmatter.calltoaction}
          background={project.frontmatter.background}
          color={project.frontmatter.color}
        />
      ))}
    </div>
  );
};

const useStylesProject = makeStyles((theme) => ({
  root: (props) => ({
    flex: '1 1 auto',
    [theme.breakpoints.down('xs')]: {
      maxWidth: 'initial',
    },
    maxWidth: 350,
    display: 'flex',
    flexDirection: 'column',
    margin: 10,
    backgroundColor: props.background,
    color: theme.palette.getContrastText(props.background),
  }),
  image: {
    margin: '0 auto 10px auto',
    display: 'block !important',
  },
  content: {
    flexGrow: 1,
  },
}));

const Project = ({ name, content, icon, link, calltoaction, background, color }) => {
  const classes = useStylesProject({ background, color });
  return (
    <Card className={classes.root}>
      <CardContent className={classes.content}>
        <GatsbyImage className={classes.image} image={icon} alt={name} />
        <Typography variant='h6'>{name}</Typography>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </CardContent>
      <CardActions>
        <Button
          size='small'
          component='a'
          href={link}
          target='_blank'
          rel='noopener'
          disabled={!link}
          color='inherit'
        >
          {calltoaction}
        </Button>
      </CardActions>
    </Card>
  );
};

export default TopProjects;
