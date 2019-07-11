import Icon from '@material-ui/icons/CheckCircleRounded';
import React from 'react';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import './timeline.css';

const Timeline = ({ topProjects }) => {
  return (
    <VerticalTimeline>
      <VerticalTimelineElement
        date='Lorem Ipsum'
        iconStyle={{ background: 'rgb(33, 150, 243)', color: '#fff' }}
        icon={<Icon />}
      >
        <h3 className='vertical-timeline-element-title'>Lorem Ipsum</h3>
        <h4 className='vertical-timeline-element-subtitle'>Dolor sit amet</h4>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      </VerticalTimelineElement>
      <VerticalTimelineElement
        date='Lorem Ipsum'
        iconStyle={{ background: 'rgb(33, 150, 243)', color: '#fff' }}
        icon={<Icon />}
      >
        <h3 className='vertical-timeline-element-title'>Lorem Ipsum</h3>
        <h4 className='vertical-timeline-element-subtitle'>Dolor sit amet</h4>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      </VerticalTimelineElement>
      <VerticalTimelineElement
        iconStyle={{ background: 'rgb(16, 204, 82)', color: '#fff' }}
        icon={<Icon />}
      />
    </VerticalTimeline>
  );
};

export default Timeline;
