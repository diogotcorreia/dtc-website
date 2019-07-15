import React from 'react';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import './timeline.css';
import { Typography } from '@material-ui/core';

const Timeline = ({ data }) => {
  return (
    <VerticalTimeline>
      {data.map((item) => {
        let Icon = require(`../assets/${item.frontmatter.iconName}.svg`);
        return (
          <VerticalTimelineElement
            key={item.frontmatter.title}
            date={item.frontmatter.date}
            iconStyle={{
              background: item.frontmatter.background,
              color: item.frontmatter.foreground,
            }}
            icon={<Icon />}
          >
            <Typography variant='h5' className='vertical-timeline-element-title'>
              {item.frontmatter.title}
            </Typography>
            <Typography variant='h6' className='vertical-timeline-element-subtitle'>
              {item.frontmatter.subtitle}
            </Typography>
            <div dangerouslySetInnerHTML={{ __html: item.html }} />
          </VerticalTimelineElement>
        );
      })}
    </VerticalTimeline>
  );
};

export default Timeline;
