import React, { Component } from 'react';
import { withStyles } from '@material-ui/styles';
import MenuIcon from '@material-ui/icons/Menu';
import {
  Hidden,
  IconButton,
  Drawer,
  ListItemIcon,
  ListItemText,
  List,
  ListItem,
} from '@material-ui/core';
import { Link } from 'gatsby';
import AnchorLink from 'react-anchor-link-smooth-scroll';
import AboutMeIcon from '@material-ui/icons/PersonRounded';
import PortfolioIcon from '@material-ui/icons/BookRounded';
import ImpossibleListIcon from '@material-ui/icons/StarRounded';

const styles = (theme) => ({
  menuButton: {
    marginRight: theme.spacing(2),
  },
  list: {
    width: 250,
  },
  listItemActive: { backgroundColor: 'rgba(0,0,0,0.14)' },
});

class MobileNavigation extends Component {
  state = {
    open: false,
  };

  toggleDrawer = (state) => (event) => {
    this.setState({ open: state });
  };

  render() {
    const { classes, homepage } = this.props;
    return (
      <div>
        <Hidden smUp>
          <IconButton
            edge='start'
            className={classes.menuButton}
            color='inherit'
            aria-label='Menu'
            onClick={this.toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
        </Hidden>
        <Drawer open={this.state.open} onClose={this.toggleDrawer(false)}>
          <List className={classes.list}>
            <ListItem
              component={homepage ? AnchorLink : Link}
              href='#aboutme'
              to='/#aboutme'
              offset='56'
              button
              onClick={this.toggleDrawer(false)}
            >
              <ListItemIcon>
                <AboutMeIcon />
              </ListItemIcon>
              <ListItemText>About me</ListItemText>
            </ListItem>
            <ListItem
              component={homepage ? AnchorLink : Link}
              href='#portfolio'
              to='/#portfolio'
              offset='56'
              button
              onClick={this.toggleDrawer(false)}
            >
              <ListItemIcon>
                <PortfolioIcon />
              </ListItemIcon>
              <ListItemText>Portfolio</ListItemText>
            </ListItem>
            <ListItem
              component={Link}
              to='/impossiblelist'
              button
              activeClassName={classes.listItemActive}
            >
              <ListItemIcon>
                <ImpossibleListIcon />
              </ListItemIcon>
              <ListItemText>Impossible List</ListItemText>
            </ListItem>
          </List>
        </Drawer>
      </div>
    );
  }
}

export default withStyles(styles)(MobileNavigation);
