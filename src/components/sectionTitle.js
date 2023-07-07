import React from 'react';
import * as styles from './sectionTitle.module.css';

const SectionTitle = ({ title, ...props }) => {
  return (
    <div className={styles.section} {...props}>
      <h4 className={styles.title}>
        {title}
      </h4>
    </div>
  );
};

export default SectionTitle;
