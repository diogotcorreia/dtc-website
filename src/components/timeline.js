import Icon from '@material-ui/icons/CheckCircleRounded';
import React from 'react';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import './timeline.css';

const Timeline = ({ data }) => {
  return (
    <VerticalTimeline>
      {data.map((item) => {
        let Icon = require(`../assets/${item.frontmatter.iconName}.svg`)
        return(
        <VerticalTimelineElement
          key={item.frontmatter.title}
          date={item.frontmatter.date}
          iconStyle={{ background: 'rgb(33, 150, 243)', color: '#fff' }}
          icon={<Icon/>}
        >
          <h3 className='vertical-timeline-element-title'>{item.frontmatter.title}</h3>
          <h4 className='vertical-timeline-element-subtitle'>{item.frontmatter.subtitle}</h4>
          <div dangerouslySetInnerHTML={{ __html: item.html }} />
        </VerticalTimelineElement>
      )})}
      <VerticalTimelineElement
        iconStyle={{ background: 'rgb(16, 204, 82)', color: '#fff' }}
        icon={<Icon />}
      />
    </VerticalTimeline>
  );
};

export default Timeline;
