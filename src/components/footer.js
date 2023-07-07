import React from 'react';
import { Link } from 'gatsby';
import * as styles from './footer.module.css';

const Footer = ({ homepage }) => {
  return (
    <footer className={styles.root}>
      <div className={`container ${styles.flex}`}>
          <div className=''>
            <h5 className={styles.sectionHeader}>Contact me</h5>
            <ul className={styles.list}>
              <li>
                Email:{' '}
                <span className={styles.lightText}>
                  <a href='mailto:me@diogotc.com' data-umami-event='mail-social-footer'>
                    me@diogotc.com
                  </a>
                </span>
              </li>
              <li>
                Discord: <span className={styles.lightText}>DiogoCorreia#7295</span>
              </li>
              <li>
                Twitter:{' '}
                <span className={styles.lightText}>
                  <a
                    href='https://twitter.com/diogotc2002'
                    rel='noopener noreferrer'
                    target='_blank'
                    data-umami-event='twitter-social-footer'
                  >
                    @diogotc2002
                  </a>
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h5 className={styles.sectionHeader}>Site map</h5>
            <ul className={styles.list}>
              <li className={styles.sitemapLink}>
                {homepage ? (
                  <a offset='64' href='#aboutme'>
                    About me
                  </a>
                ) : (
                  <Link to='/#aboutme'>About me</Link>
                )}
              </li>
              <li className={styles.sitemapLink}>
                {homepage ? (
                  <a offset='64' href='#portfolio'>
                    Portfolio
                  </a>
                ) : (
                  <Link to='/#portfolio'>Portfolio</Link>
                )}
              </li>
              <li className={styles.sitemapLink}>
                <Link to='/impossiblelist'>Impossible List</Link>
              </li>
            </ul>
          </div>
      </div>
      <div className={styles.credits}>
        <div className='container'>
          <span>© 2017-{new Date().getFullYear()} Diogo Torres Correia</span>
          <span>
            <a
              href='https://github.com/diogotcorreia/dtc-website'
              rel='noopener noreferrer'
              target='_blank'
              data-umami-event='source-code-footer'
            >
              Website Source Code
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
