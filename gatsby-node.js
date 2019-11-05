const data = require('./shortlinks.json');

exports.createPages = ({ actions }) => {
  const { createRedirect } = actions;
  data.forEach((shortlink) => createRedirect(shortlink));
};
