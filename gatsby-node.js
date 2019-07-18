const path = require(`path`);
const data = require('./src/content/shortlink.json');

exports.createPages = ({ actions }) => {
  const { createPage } = actions;

  const template = path.resolve('./src/components/shortlink.js');

  data.forEach((shortlink) => {
    createPage({
      path: shortlink.path,
      component: template,
      context: shortlink.link,
    });
  });
};
