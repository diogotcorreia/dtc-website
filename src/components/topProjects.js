import { Box, Button, Card, CardActions, CardContent, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { GatsbyImage } from 'gatsby-plugin-image';
import React from 'react';

const TopProjects = ({ topProjects }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexFlow: 'row wrap',
        justifyContent: 'center',
        alignContent: 'center',
      }}
    >
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
    </Box>
  );
};

const ProjectCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'background',
})(({ background, theme }) => ({
  flex: '1 1 auto',
  [theme.breakpoints.down('sm')]: {
    maxWidth: 'initial',
  },
  maxWidth: 350,
  display: 'flex',
  flexDirection: 'column',
  margin: 10,
  backgroundColor: background,
  color: theme.palette.getContrastText(background),
}));

const ProjectImage = styled(GatsbyImage)(() => ({
  margin: '0 auto 10px auto',
  display: 'block !important',
}));

const Project = ({ name, content, icon, link, calltoaction, background, color }) => {
  return (
    <ProjectCard background={background}>
      <CardContent sx={{ flexGrow: 1 }}>
        <ProjectImage image={icon} alt={name} />
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
    </ProjectCard>
  );
};

export default TopProjects;
